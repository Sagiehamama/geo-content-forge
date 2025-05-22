import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

// Initialize Supabase client
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { formData, templateId } = await req.json();
    // Log every incoming request
    console.log(`[${new Date().toISOString()}] generate-content request:`, formData?.prompt);
    
    if (!formData) {
      return new Response(
        JSON.stringify({ error: 'Missing form data' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Check for OpenAI API key and provide a more detailed error message
    if (!openAIApiKey) {
      console.error('OpenAI API key not found in environment variables');
      return new Response(
        JSON.stringify({ 
          error: 'OpenAI API key is not configured in the Supabase Edge Function secrets. Please contact the administrator.',
          missingKey: true
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    // Fetch template from database (either specified template or default)
    let templateQuery = supabase.from('content_templates').select('*');
    
    if (templateId) {
      templateQuery = templateQuery.eq('id', templateId);
    } else {
      templateQuery = templateQuery.eq('is_default', true);
    }
    
    const { data: templateData, error: templateError } = await templateQuery.single();
    
    if (templateError || !templateData) {
      console.error("Template error:", templateError);
      return new Response(
        JSON.stringify({ error: 'Could not find content template', details: templateError }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    // Process template with variable replacements
    let systemPrompt = templateData.system_prompt;
    
    // Add dynamic variables to system prompt
    systemPrompt += `\n\nThe content should be tailored for this audience: ${formData.audience || 'General readers'}
Write in this tone: ${formData.tone || 'Informative'}
The country focus should be: ${formData.country || 'Global'}
The target language is: ${formData.language || 'English'}
Word count should be approximately: ${formData.wordCount || 1000} words

${formData.toneUrl ? `The content should mimic the writing style found at: ${formData.toneUrl}` : ''}`;

    // Process user prompt template with variable replacements
    const userPrompt = templateData.user_prompt
      .replace('${prompt}', formData.prompt)
      .replace('${includeFrontmatter ? "Include YAML frontmatter with metadata (title, description, tags, slug, author, date)." : ""}', 
               formData.includeFrontmatter ? "Include YAML frontmatter with metadata (title, description, tags, slug, author, date)." : "")
      .replace('${includeImages ? "Describe where images should be placed with suggested alt text and captions." : ""}',
               formData.includeImages ? "Describe where images should be placed with suggested alt text and captions." : "");
    
    // Call OpenAI API
    console.log("Calling OpenAI API with template:", templateData.name);
    const completion = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${openAIApiKey}`
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 4000,
      })
    });

    if (!completion.ok) {
      const error = await completion.json();
      console.error("OpenAI API error:", error);
      
      // Handle specific OpenAI errors
      if (error.error?.code === "insufficient_quota") {
        return new Response(
          JSON.stringify({ 
            error: 'OpenAI API quota exceeded. Please check your OpenAI billing and credits.',
            code: 'OPENAI_QUOTA_ERROR',
            details: error.error
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 402 }
        );
      }
      if (error.error?.code === "rate_limit_exceeded") {
        return new Response(
          JSON.stringify({
            error: 'OpenAI API rate limit reached. Please wait a few seconds and try again.',
            code: 'OPENAI_RATE_LIMIT',
            details: error.error
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 429 }
        );
      }
      
      return new Response(
        JSON.stringify({ 
          error: 'Error calling OpenAI API', 
          code: 'OPENAI_API_ERROR',
          details: error 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    const data = await completion.json();
    const generatedContent = data.choices[0].message.content;

    // Parse frontmatter from markdown if included
    let frontmatter = {
      title: formData.prompt.charAt(0).toUpperCase() + formData.prompt.slice(1),
      description: "",
      tags: [formData.prompt],
      slug: formData.prompt.toLowerCase().replace(/\s+/g, '-'),
      author: "AI Content Generator",
      date: new Date().toISOString().split('T')[0],
      featuredImage: ""
    };

    if (formData.includeFrontmatter && generatedContent.startsWith('---')) {
      try {
        const fmMatch = generatedContent.match(/^---([\s\S]*?)---/m);
        if (fmMatch && fmMatch[1]) {
          const fmContent = fmMatch[1].trim();
          const fmLines = fmContent.split('\n');
          
          fmLines.forEach(line => {
            const [key, ...valueParts] = line.split(':');
            if (key && valueParts.length > 0) {
              const value = valueParts.join(':').trim();
              if (key.trim() === 'tags') {
                try {
                  // Handle tags in various formats: [tag1, tag2] or tag1, tag2
                  let tagsStr = value.replace(/^\[|\]$/g, '');
                  frontmatter.tags = tagsStr.split(',').map(tag => tag.trim());
                } catch (e) {
                  frontmatter.tags = [value];
                }
              } else {
                frontmatter[key.trim()] = value;
              }
            }
          });
        }
      } catch (e) {
        console.error("Error parsing frontmatter:", e);
      }
    }

    // Calculate approximate reading time (average reading speed: 200-250 words per minute)
    const wordCount = generatedContent.split(/\s+/).length;
    const readingTime = Math.ceil(wordCount / 200);

    // Create the response object with actual content data and no mock metrics
    const responseObject = {
      title: frontmatter.title,
      content: generatedContent,
      frontmatter: frontmatter,
      images: [], // Note: Currently no image generation functionality
      wordCount: wordCount,
      readingTime: readingTime, // This is a simple calculation, not randomized
      templateId: templateData.id,
      templateName: templateData.name
    };

    return new Response(
      JSON.stringify(responseObject),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error("Error in generate-content function:", error);
    return new Response(
      JSON.stringify({ 
        error: 'An unexpected error occurred', 
        code: 'UNKNOWN_ERROR',
        details: error.message 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
