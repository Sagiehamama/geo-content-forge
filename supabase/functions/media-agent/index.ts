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

const PLACEHOLDER_IMAGE = 'https://via.placeholder.com/600x400?text=Image+Not+Found';

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
    console.log('Searching Unsplash for (exact query):', query);
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
    console.log('Unsplash response:', data.results?.length, 'images found for query:', query);
    
    if (!data.results?.length) {
      throw new Error('No images found');
    }
    
    return data.results.map(photo => ({
      url: photo.urls.regular,  // Remove the extra query params that were causing issues
      alt: photo.alt_description || query,
      caption: photo.description || `Image for ${query}`,
      source: `Unsplash (Photo by ${photo.user.name})`
    }));
  } catch (error) {
    console.error('Error searching Unsplash for query:', query, error);
    // Return a more visually obvious placeholder for errors
    return [
      {
        url: PLACEHOLDER_IMAGE,
        alt: `${query} - Placeholder`,
        caption: `Placeholder for ${query}`,
        source: 'System (Error loading Unsplash images)'
      }
    ];
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { markdown, title, customDescription } = await req.json();
    // Log every incoming request
    console.log(`[${new Date().toISOString()}] media-agent request:`, title || markdown?.slice(0, 40), 'Custom Desc Value:', customDescription);
    
    if (!markdown && !customDescription) {
      return new Response(
        JSON.stringify({ error: 'Missing markdown content (and no custom description)' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // If we have a custom description, use it directly
    if (customDescription) {
      console.log('CUSTOM PATH: Using custom description received from frontend:', customDescription);
      const images = [{
        location: 'spot_1',
        options: await searchImages(customDescription)
      }];
      console.log('CUSTOM PATH: Images from custom search (first 500 chars):', JSON.stringify(images, null, 2).slice(0, 500));

      return new Response(
        JSON.stringify({ images }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Otherwise, proceed with AI-generated suggestions
    console.log('AI PATH: No custom description, proceeding with AI suggestions.');
    // Fetch the media agent prompt from the DB
    const { data: templateData, error: templateError } = await supabase
      .from('content_templates')
      .select('media_agent_prompt')
      .eq('is_default', true)
      .maybeSingle();

    if (templateError) {
      return new Response(
        JSON.stringify({ error: 'Could not find media agent prompt', details: templateError }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    // Default media agent prompt if none exists
    const DEFAULT_MEDIA_AGENT_PROMPT = `You are a specialized Media Selection Agent for a content creation platform. Your task is to analyze Markdown content and identify 1-3 optimal spots where images would enhance the article.

INSTRUCTIONS:
1. Analyze the provided Markdown article thoroughly
2. Identify 1-3 strategic locations where images would enhance reader engagement and understanding
3. For each location, create a descriptive tag (e.g., "product_showcase", "feature_highlight", "comparison")
4. Generate a specific image search query that would find highly relevant, visually appealing images for that location
5. Return your analysis as a properly formatted JSON array

FORMAT YOUR RESPONSE AS JSON:
[
  {
    "location": "descriptive_tag_for_location", 
    "query": "specific search query for relevant image"
  }
]

GUIDELINES FOR GOOD LOCATIONS:
- Article introduction (create visual interest)
- Between major sections (break up text)
- To illustrate specific products or features
- For key comparisons or demonstrations
- For emotional impact at critical points

GUIDELINES FOR GOOD SEARCH QUERIES:
- Focus on the specific product, feature, or concept being discussed
- Use concrete nouns and descriptive adjectives
- Avoid generic terms like "best", "top", or "professional"
- For products, include the product type and key features (e.g., "hardshell rolling suitcase" not just "suitcase")
- For concepts, describe the visual scene you want (e.g., "traveler packing suitcase" not just "packing")

Example for a suitcase article:
BAD QUERIES: "best suitcase", "professional luggage photo", "top travel gear"
GOOD QUERIES: "hardshell rolling suitcase blue", "carry-on luggage overhead compartment", "traveler packing expandable suitcase"

Always return valid, properly formatted JSON. Make your image queries as specific and concrete as possible.`;

    const mediaAgentPrompt = (templateData?.media_agent_prompt || DEFAULT_MEDIA_AGENT_PROMPT).trim();
    
    if (!mediaAgentPrompt) {
      return new Response(
        JSON.stringify({ error: 'Media agent prompt is empty' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    if (!openAIApiKey) {
      return new Response(
        JSON.stringify({ error: 'OpenAI API key is not configured in the server environment.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    // Use the media agent prompt from the database
    console.log('AI PATH: Using mediaAgentPrompt (first 100 chars):', mediaAgentPrompt.slice(0, 100) + '...');
    console.log('AI PATH: Markdown for AI analysis (first 100 chars):', markdown.slice(0, 100) + '...');
    const completion = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${openAIApiKey}`
      },
      body: JSON.stringify({
        model: "gpt-4",
        messages: [
          { role: "system", content: mediaAgentPrompt },
          { role: "user", content: `Here is the Markdown content to analyze:\n\n${markdown}` }
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
    console.log('AI PATH: Raw AI response for image suggestions:', suggestionsText);

    // Parse the LLM output (expecting a JSON array)
    let imageSpots: { location: string, query: string }[] = [];
    try {
      // First try to parse as JSON
      const jsonResult = JSON.parse(suggestionsText);
      console.log('AI PATH: Parsed AI response (raw from OpenAI):', jsonResult);
      
      // Handle array format
      if (Array.isArray(jsonResult)) {
        imageSpots = jsonResult.map((spotData, idx) => {
          // The AI might return "search_query" and "location_tag" (seen in logs)
          // or "query" and "location" (as requested in the default system prompt).
          const actualQuery = spotData.search_query || spotData.query;
          return {
            location: `spot_${idx + 1}`, // Standardized location name for frontend
            query: (actualQuery || title || 'task management').trim()
          };
        });
      } 
      // Handle object format with numbered keys
      else if (typeof jsonResult === 'object' && jsonResult !== null) {
        imageSpots = Object.entries(jsonResult).map(([key, valueObj], idx) => {
          let extractedQuery = '';
          if (typeof valueObj === 'string') {
            extractedQuery = valueObj;
          } else if (typeof valueObj === 'object' && valueObj !== null) {
            extractedQuery = (valueObj as any).search_query || (valueObj as any).query || (valueObj as any).description;
          }
          return {
            location: `spot_${idx+1}`,
            query: (extractedQuery || title || 'task management').trim()
          };
        });
      } else {
        console.warn('AI PATH: AI response was not a JSON array or recognized object. Will rely on later fallbacks if imageSpots remains empty.');
      }

      console.log('AI PATH: Image spots after JSON parsing attempt:', imageSpots);
    } catch (e) {
      console.error('AI PATH: Failed to parse AI JSON response, or error during initial parsing. Error:', e);
      // Fallback: try to parse a numbered list or bullet points
      const lines = suggestionsText.split('\n').filter(l => l.trim());
      imageSpots = lines
        .map((line, idx) => {
          // Clean up the line by removing prefixes like "1. " or "* " and extract the query
          let cleanLine = line.replace(/^\s*[\d.*-]\s*/, '').trim(); 
          const queryMarkers = ['query:', 'search_query:', 'description:'];
          for (const marker of queryMarkers) {
            if (cleanLine.toLowerCase().startsWith(marker)) {
              cleanLine = cleanLine.substring(marker.length).trim();
              break; 
            }
          }
          return {
            location: `spot_${idx+1}`,
            query: (cleanLine || title || 'task management').trim()
          };
        }).filter(spot => spot.query && spot.query !== (title || 'task management')); // Filter out spots that only got a fallback
      
      if (imageSpots.length === 0 && lines.length > 0) {
        console.log('AI PATH: Text parsing yielded no specific queries, using raw lines as fallback.');
        imageSpots = lines.slice(0, Math.min(3, lines.length)).map((line, idx) => ({
          location: `spot_${idx+1}`,
          query: (line.trim() || title || 'task management').trim()
        }));
      }
      console.log('AI PATH: Image spots after text-based fallback parsing:', imageSpots);
    }
    
    // Ensure we have at least one image spot
    if (imageSpots.length === 0) {
      console.log('AI PATH: No image spots identified after all parsing attempts. Defaulting to title-based query.');
      imageSpots = [
        { location: 'spot_1', query: (title || 'task management tools').trim() }
      ];
    }
    
    // Limit to max 3 image spots
    imageSpots = imageSpots.slice(0, 3);
    
    console.log('AI PATH: Final image spots selected for Unsplash search (max 3):', imageSpots);

    // For each spot, search for images
    const images: { location: string; options: Awaited<ReturnType<typeof searchImages>> }[] = [];
    for (const spot of imageSpots) {
      console.log(`AI PATH: Calling searchImages for spot location "${spot.location}" with query: "${spot.query}"`);
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