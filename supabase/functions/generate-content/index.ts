import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

// Initialize Supabase client
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// 🎯 XRAY: Conversation capture for Content Generator
interface XrayMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  timestamp: number;
}

interface XrayStep {
  id: string;
  type: 'ai_conversation' | 'logical_operation';
  name: string;
  description: string;
  timestamp: number;
  duration?: number;
  status: 'running' | 'completed' | 'failed';
  // For AI conversations
  messages?: XrayMessage[];
  model?: string;
  tokens?: number;
  // For logical operations
  input?: any;
  output?: any;
  metadata?: any;
}

interface XrayConversation {
  steps: XrayStep[];
  messages: XrayMessage[];
  timing: { start: number; end: number; duration: number };
  tokens?: number;
  model: string;
}

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
    const { formData, templateId, xraySessionId } = await req.json();
    // Log every incoming request
    console.log(`[${new Date().toISOString()}] generate-content request:`, formData?.prompt);
    
    if (!formData) {
      return new Response(
        JSON.stringify({ error: 'Missing form data' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // 🎯 XRAY: Initialize conversation capture
    const contentGeneratorConversation: XrayConversation = {
      steps: [],
      messages: [],
      timing: { start: Date.now(), end: 0, duration: 0 },
      model: 'gpt-4o'
    };

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

    // Fetch template from database (either specified template or default) - no XRAY tracking for internal operations
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

    // 🎯 XRAY: Step 1 - Prompt Processing
    const promptProcessingStart = Date.now();
    contentGeneratorConversation.steps.push({
      id: 'prompt_processing',
      type: 'logical_operation',
      name: 'Prompt Processing',
      description: 'Processing template variables and building system/user prompts',
      timestamp: promptProcessingStart,
      status: 'running',
      input: { 
        template_used: templateData.name,
        word_count: formData.wordCount,
        language: formData.language,
        has_company_context: !!formData.company
      }
    });

    // Process template with variable replacements
    let systemPrompt = templateData.system_prompt;
    
    // Add dynamic variables to system prompt
    systemPrompt += `\n\nThe content should be tailored for this audience: ${formData.audience || 'General readers'}
Write in this tone: ${formData.tone || 'Informative'}
The country focus should be: ${formData.country || 'Global'}
The target language is: ${formData.language || 'English'}
Word count should be approximately: ${formData.wordCount || 1000} words

${formData.company ? `Company/Brand Context: ${formData.company}` : ''}
${formData.toneUrl ? `The content should mimic the writing style found at: ${formData.toneUrl}` : ''}`;

    // Process user prompt template with variable replacements
    // Set up variables for template literal processing
    const prompt = formData.prompt;
    const company = formData.company || '';
    const includeFrontmatter = formData.includeFrontmatter;
    const includeImages = formData.includeImages;
    
    // Clean template by removing quotes around template variables
    const cleanTemplate = templateData.user_prompt
      .replace(/"(\${[^}]+})"/g, '$1')
      .replace(/'(\${[^}]+})'/g, '$1');
    
    // Use Function constructor for safe template literal evaluation
    const templateFunction = new Function(
      'prompt', 
      'company', 
      'includeFrontmatter', 
      'includeImages',
      'wordCount',
      'return `' + cleanTemplate + '`;'
    );
    const userPrompt = templateFunction(prompt, company, includeFrontmatter, includeImages, formData.wordCount);
    
    // 🎯 XRAY: Complete prompt processing step
    const promptProcessingStep = contentGeneratorConversation.steps.find(s => s.id === 'prompt_processing');
    if (promptProcessingStep) {
      promptProcessingStep.status = 'completed';
      promptProcessingStep.duration = Date.now() - promptProcessingStart;
      promptProcessingStep.output = {
        prompts_ready: true,
        system_prompt_length: systemPrompt.length,
        user_prompt_length: userPrompt.length,
        final_word_count: formData.wordCount || 1000
      };
      promptProcessingStep.metadata = {
        template_variables_used: ['audience', 'tone', 'country', 'language', 'wordCount'],
        dynamic_additions: ['company_context', 'tone_url'].filter(key => 
          (key === 'company_context' && formData.company) || 
          (key === 'tone_url' && formData.toneUrl)
        )
      };
    }
    
    // Debug logging
    console.log("=== DEBUGGING COMPANY FIELD ===");
    console.log("formData.company value:", JSON.stringify(formData.company));
    console.log("Company field length:", formData.company ? formData.company.length : 0);
    console.log("=== FINAL PROMPTS TO OPENAI ===");
    console.log("System Prompt:", systemPrompt);
    console.log("User Prompt:", userPrompt);
    console.log("================================");
    
    // 🎯 XRAY: Step 2 - AI Content Generation
    const aiGenerationStart = Date.now();
    const aiGenerationStep: XrayStep = {
      id: 'ai_content_generation',
      type: 'ai_conversation',
      name: 'AI Content Generation',
      description: 'AI generates content based on processed prompts',
      timestamp: aiGenerationStart,
      status: 'running',
      messages: [
        { role: 'system', content: systemPrompt, timestamp: aiGenerationStart },
        { role: 'user', content: userPrompt, timestamp: aiGenerationStart + 100 }
      ],
      model: 'gpt-4o'
    };
    contentGeneratorConversation.steps.push(aiGenerationStep);
    
    // 🎯 XRAY: Capture system message (for backward compatibility)
    contentGeneratorConversation.messages.push({
      role: 'system',
      content: systemPrompt,
      timestamp: Date.now()
    });

    // 🎯 XRAY: Capture user message (for backward compatibility)
    contentGeneratorConversation.messages.push({
      role: 'user',
      content: userPrompt,
      timestamp: Date.now()
    });

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

    // 🎯 XRAY: Complete AI Content Generation step
    const aiGenerationEnd = Date.now();
    aiGenerationStep.messages!.push({
      role: 'assistant',
      content: generatedContent,
      timestamp: aiGenerationEnd
    });
    aiGenerationStep.status = 'completed';
    aiGenerationStep.duration = aiGenerationEnd - aiGenerationStart;
    aiGenerationStep.tokens = data.usage?.total_tokens || 0;

    // 🎯 XRAY: Capture assistant response (for backward compatibility)
    contentGeneratorConversation.messages.push({
      role: 'assistant',
      content: generatedContent,
      timestamp: Date.now()
    });

    // 🎯 XRAY: Track token usage and finalize timing
    if (data.usage?.total_tokens) {
      contentGeneratorConversation.tokens = data.usage.total_tokens;
    }

    console.log(`✅ XRAY: Content Generator captured ${contentGeneratorConversation.messages.length} messages`);

    // 🎯 XRAY: Step 3 - Content Analysis
    const contentAnalysisStart = Date.now();
    contentGeneratorConversation.steps.push({
      id: 'content_analysis',
      type: 'logical_operation',
      name: 'Content Analysis',
      description: 'Parsing frontmatter, calculating word count and reading time',
      timestamp: contentAnalysisStart,
      status: 'running',
      input: { 
        content_length: generatedContent.length,
        include_frontmatter: formData.includeFrontmatter,
        has_frontmatter: generatedContent.startsWith('---')
      }
    });

    // Parse frontmatter from markdown if included
    const frontmatter = {
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
                  const tagsStr = value.replace(/^\[|\]$/g, '');
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

    // 🎯 XRAY: Complete content analysis step
    const contentAnalysisStep = contentGeneratorConversation.steps.find(s => s.id === 'content_analysis');
    if (contentAnalysisStep) {
      contentAnalysisStep.status = 'completed';
      contentAnalysisStep.duration = Date.now() - contentAnalysisStart;
      contentAnalysisStep.output = {
        word_count: wordCount,
        reading_time_minutes: readingTime,
        frontmatter_parsed: formData.includeFrontmatter && generatedContent.startsWith('---'),
        frontmatter_fields: Object.keys(frontmatter).length
      };
      contentAnalysisStep.metadata = {
        frontmatter_parsing_attempted: formData.includeFrontmatter,
        content_has_frontmatter: generatedContent.startsWith('---'),
        reading_speed_wpm: 200
      };
    }

    // 🎯 XRAY: Finalize conversation timing
    contentGeneratorConversation.timing.end = Date.now();
    contentGeneratorConversation.timing.duration = contentGeneratorConversation.timing.end - contentGeneratorConversation.timing.start;

    // Create the response object with actual content data and XRAY conversations
    const responseObject = {
      title: frontmatter.title,
      content: generatedContent,
      frontmatter: frontmatter,
      images: [], // Note: Currently no image generation functionality
      wordCount: wordCount,
      readingTime: readingTime, // This is a simple calculation, not randomized
      templateId: templateData.id,
      templateName: templateData.name,
      // 🎯 XRAY: Include conversation data if session ID provided
      ...(xraySessionId && {
        conversations: {
          content_generator: contentGeneratorConversation
        }
      })
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
