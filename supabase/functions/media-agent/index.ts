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

// Simplify complex queries to improve Unsplash results
function simplifySearchQuery(query: string): string {
  // Common query simplification mappings
  const queryMappings: Record<string, string> = {
    // Location-specific terms -> general terms
    'geneva to chamonix': 'mountains',
    'chamonix': 'mountains',
    'geneva airport': 'airport',
    'swiss alps': 'mountains',
    'mont blanc': 'mountains',
    
    // Complex transport terms -> simple ones
    'car rental at': 'car rental',
    'bus from': 'bus',
    'travel from': 'travel',
    'scenic route': 'scenic',
    'journey to': 'travel',
    
    // Activity terms simplification
    'mountain climbing in': 'climbing',
    'hiking trails and': 'hiking',
    'thermal spas in': 'spa',
    'adventure seekers': 'adventure',
  };
  
  const lowerQuery = query.toLowerCase().trim();
  
  // Check for direct mappings first
  for (const [complex, simple] of Object.entries(queryMappings)) {
    if (lowerQuery.includes(complex)) {
      console.log(`Simplified query "${query}" -> "${simple}"`);
      return simple;
    }
  }
  
  // If no mapping found, extract key terms (max 2 words)
  const words = lowerQuery.split(/\s+/).filter(word => 
    word.length > 2 && 
    !['and', 'the', 'for', 'from', 'to', 'at', 'in', 'of'].includes(word)
  );
  
  if (words.length > 2) {
    const simplified = words.slice(0, 2).join(' ');
    console.log(`Simplified query "${query}" -> "${simplified}"`);
    return simplified;
  }
  
  return query;
}

// Real Unsplash image search API
async function searchImages(query: string) {
  // Simplify complex queries to improve Unsplash results
  const simplifiedQuery = simplifySearchQuery(query);
  
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
      `https://api.unsplash.com/search/photos?query=${encodeURIComponent(simplifiedQuery)}&per_page=3&orientation=landscape`,
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
    console.log('Unsplash response:', data.results?.length, 'images found for query:', simplifiedQuery);
    
    if (!data.results?.length) {
      throw new Error('No images found');
    }
    
    return data.results.map(photo => ({
      url: photo.urls.regular,  // Remove the extra query params that were causing issues
      alt: photo.alt_description || query,
      caption: photo.description || `Image for ${query}${simplifiedQuery !== query ? ` (searched: ${simplifiedQuery})` : ''}`,
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
    const DEFAULT_MEDIA_AGENT_PROMPT = `You are an AI assistant for image search. Analyze the content and return 1-3 image spots as JSON:
[{"location_tag": "spot_1", "search_query": "mountains"}]
Use simple 1-2 word search queries only.`;

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
    console.log('=== DEBUGGING MEDIA AGENT PROMPT ===');
    console.log('Database templateData:', templateData);
    console.log('Final mediaAgentPrompt being used:');
    console.log(mediaAgentPrompt);
    console.log('=====================================');
    
    console.log('AI PATH: Markdown for AI analysis (first 200 chars):', markdown.slice(0, 200) + '...');
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
    console.log('=== RAW AI RESPONSE ===');
    console.log('Full AI response:');
    console.log(suggestionsText);
    console.log('=====================');

    // Parse the LLM output (expecting a JSON array)
    let imageSpots: { location: string, query: string }[] = [];
    try {
      // First try to parse as JSON
      const jsonResult = JSON.parse(suggestionsText);
      console.log('=== PARSED JSON RESULT ===');
      console.log('Parsed JSON from AI:', JSON.stringify(jsonResult, null, 2));
      console.log('========================');
      
      // Handle array format
      if (Array.isArray(jsonResult)) {
        imageSpots = jsonResult.map((spotData, idx) => {
          // The database prompt uses "search_query" and "location_tag"
          const actualQuery = spotData.search_query || spotData.query;
          const actualLocation = spotData.location_tag || spotData.location || `spot_${idx + 1}`;
          
          console.log(`Processing spot ${idx + 1}:`, {
            original: spotData,
            extractedQuery: actualQuery,
            extractedLocation: actualLocation
          });
          
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

      console.log('=== FINAL IMAGE SPOTS ===');
      console.log('Image spots after JSON parsing:', JSON.stringify(imageSpots, null, 2));
      console.log('========================');
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