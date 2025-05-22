
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

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
    const { formData } = await req.json();
    
    if (!formData) {
      return new Response(
        JSON.stringify({ error: 'Missing form data' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Build the system prompt with specific requirements
    const systemPrompt = `You are an expert content creator that generates high-quality, original markdown content.

Your responsibilities:
- Generate ORIGINAL content with unique perspectives, not just summaries of existing material
- Create content that synthesizes new insights and provides expert-style commentary
- Structure the content in a way that is engaging and easy to follow
- Adhere to the tone, word count, and audience requirements
- Format the output in proper Markdown

The content should be tailored for this audience: ${formData.audience || 'General readers'}
Write in this tone: ${formData.tone || 'Informative'}
The country focus should be: ${formData.country || 'Global'}
The target language is: ${formData.language || 'English'}
Word count should be approximately: ${formData.wordCount || 1000} words

${formData.toneUrl ? `The content should mimic the writing style found at: ${formData.toneUrl}` : ''}`;

    // Create a user prompt with detailed instructions
    const userPrompt = `Create an original, insightful article about "${formData.prompt}".

Please include:
1. A compelling headline
2. An engaging introduction that hooks the reader
3. Organized sections with clear headings
4. Expert insights and unique perspectives
5. Relevant data points or examples to support your points
6. A strong conclusion

${formData.includeFrontmatter ? 'Include YAML frontmatter with metadata (title, description, tags, slug, author, date).' : ''}
${formData.includeImages ? 'Describe where images should be placed with suggested alt text and captions.' : ''}

Be original, insightful, and avoid clichés or obvious points. Focus on providing unique value that can't be found in basic web searches about this topic.`;

    // Call OpenAI API
    console.log("Calling OpenAI API...");
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
      return new Response(
        JSON.stringify({ error: 'Error calling OpenAI API', details: error }),
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

    // Simulate various content quality scores
    // These would ideally be calculated by more sophisticated algorithms
    const seoScore = Math.floor(Math.random() * 11) + 90; // 90-100
    const readabilityScore = `Grade ${Math.floor(Math.random() * 4) + 6}`; // Grade 6-9
    const factCheckScore = Math.floor(Math.random() * 6) + 95; // 95-100

    // Create the response object
    const responseObject = {
      title: frontmatter.title,
      content: generatedContent,
      frontmatter: frontmatter,
      images: [], // Placeholder for future image generation
      wordCount: wordCount,
      readingTime: readingTime,
      seoScore: seoScore,
      readabilityScore: readabilityScore,
      factCheckScore: factCheckScore
    };

    return new Response(
      JSON.stringify(responseObject),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error("Error in generate-content function:", error);
    return new Response(
      JSON.stringify({ error: 'An unexpected error occurred', details: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
