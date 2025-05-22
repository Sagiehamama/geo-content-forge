import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const unsplashAccessKey = Deno.env.get('UNSPLASH_ACCESS_KEY');

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Real Unsplash image search API
async function searchImages(query: string) {
  if (!unsplashAccessKey) {
    console.warn('UNSPLASH_ACCESS_KEY not configured, using fallback images');
    return [
      {
        url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=600&q=80',
        alt: `${query} - Example Image 1`,
        caption: `A relevant image for ${query}`,
        source: 'Unsplash'
      },
      {
        url: 'https://images.unsplash.com/photo-1465101046530-73398c7f28ca?auto=format&fit=crop&w=600&q=80',
        alt: `${query} - Example Image 2`,
        caption: `Another relevant image for ${query}`,
        source: 'Unsplash'
      }
    ];
  }
  
  try {
    const response = await fetch(
      `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=3`,
      {
        headers: {
          'Authorization': `Client-ID ${unsplashAccessKey}`
        }
      }
    );
    
    if (!response.ok) {
      throw new Error(`Unsplash API error: ${response.status}`);
    }
    
    const data = await response.json();
    return data.results.map(photo => ({
      url: `${photo.urls.regular}&auto=format&fit=crop&w=600&q=80`,
      alt: photo.alt_description || query,
      caption: photo.description || `Image for ${query}`,
      source: `Unsplash (Photo by ${photo.user.name})`
    }));
  } catch (error) {
    console.error('Error searching images:', error);
    // Fallback images in case of API failure
    return [
      {
        url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=600&q=80',
        alt: `${query} - Example Image 1`,
        caption: `A relevant image for ${query}`,
        source: 'Unsplash'
      },
      {
        url: 'https://images.unsplash.com/photo-1465101046530-73398c7f28ca?auto=format&fit=crop&w=600&q=80',
        alt: `${query} - Example Image 2`,
        caption: `Another relevant image for ${query}`,
        source: 'Unsplash'
      }
    ];
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { markdown, title, tags, summary } = await req.json();
    // Log every incoming request
    console.log(`[${new Date().toISOString()}] media-agent request:`, title || markdown?.slice(0, 40));
    if (!markdown) {
      return new Response(
        JSON.stringify({ error: 'Missing markdown content' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Fetch the media agent prompt from the DB
    const { data: templateData, error: templateError } = await supabase
      .from('content_templates')
      .select('media_agent_prompt')
      .eq('is_default', true)
      .maybeSingle();

    if (templateError || !templateData) {
      return new Response(
        JSON.stringify({ error: 'Could not find media agent prompt', details: templateError }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    const mediaAgentPrompt = templateData.media_agent_prompt || '';
    if (!openAIApiKey) {
      return new Response(
        JSON.stringify({ error: 'OpenAI API key is not configured in the server environment.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    // Compose the prompt for the LLM
    const systemPrompt = mediaAgentPrompt;
    const userPrompt = `Here is a blog article in Markdown format. Analyze the content and suggest 1-3 logical spots for images. For each spot, provide a short description or search query for the image needed.\n\nMarkdown:\n${markdown}`;

    // Call OpenAI API to get image spot suggestions
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
        temperature: 0.5,
        max_tokens: 800,
      })
    });

    if (!completion.ok) {
      const error = await completion.json();
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
        JSON.stringify({ error: 'Error calling OpenAI API', details: error }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    const data = await completion.json();
    const suggestionsText = data.choices[0].message.content;

    // Parse the LLM output (expecting a simple JSON or numbered list)
    // Example expected: [{ location: 'after_intro', query: 'infographic about X' }, ...]
    let imageSpots: { location: string, query: string }[] = [];
    try {
      imageSpots = JSON.parse(suggestionsText);
    } catch {
      // Fallback: try to parse a numbered list
      const lines = suggestionsText.split('\n').filter(l => l.trim());
      imageSpots = lines.map((line, idx) => ({
        location: `spot_${idx+1}`,
        query: line.replace(/^\d+\.\s*/, '').trim()
      }));
    }

    // For each spot, search for images
    const images = [];
    for (const spot of imageSpots) {
      const options = await searchImages(spot.query);
      images.push({
        location: spot.location,
        options
      });
    }

    return new Response(
      JSON.stringify({ images }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: 'An unexpected error occurred', details: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
}); 