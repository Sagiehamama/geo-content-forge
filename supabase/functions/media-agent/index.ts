import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// 🎯 XRAY: Interfaces for Media Agent step tracking
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

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const unsplashAccessKey = Deno.env.get('UNSPLASH_ACCESS_KEY');

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const PLACEHOLDER_IMAGE = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAwIiBoZWlnaHQ9IjQwMCIgdmlld0JveD0iMCAwIDYwMCA0MDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI2MDAiIGhlaWdodD0iNDAwIiBmaWxsPSIjRjNGNEY2Ii8+Cjx0ZXh0IHg9IjMwMCIgeT0iMjAwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkb21pbmFudC1iYXNlbGluZT0ibWlkZGxlIiBmaWxsPSIjOUI5QjlCIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTgiPkltYWdlIE5vdCBGb3VuZDwvdGV4dD4KPC9zdmc+';

// Simplify complex queries to improve Unsplash results
function simplifySearchQuery(query: string): string {
  console.log('🔍 SIMPLIFY INPUT:', query);
  
  // Common query simplification mappings - keep them specific and descriptive
  const queryMappings: Record<string, string> = {
    // Location-specific terms -> more specific terms
    'geneva to chamonix': 'alpine mountains scenery',
    'chamonix': 'chamonix mont blanc',
    'geneva airport': 'geneva airport terminal',
    'swiss alps': 'swiss alpine landscape',
    'mont blanc': 'mont blanc mountain',
    
    // Complex transport terms -> specific ones
    'car rental at': 'car rental service',
    'bus from': 'bus transportation',
    'travel from': 'travel journey',
    'scenic route': 'scenic mountain road',
    'journey to': 'travel destination',
    
    // Activity terms - keep specific
    'mountain climbing in': 'mountain climbing gear',
    'hiking trails and': 'hiking trail nature',
    'thermal spas in': 'thermal spa relaxation',
    'adventure seekers': 'outdoor adventure',
    
    // Food and vegan-related terms - keep descriptive
    'thoughtful_individual_pondering': 'person thinking about food choices',
    'ethical_choices_with_food': 'ethical food decisions',
    'vegan_pizza_on_wooden_board': 'vegan pizza wooden board',
    'fresh_ingredients': 'fresh organic vegetables',
    'diverse_group_of_people_sharing': 'people sharing vegan meal',
    'vegan_meal_in_cozy_setting': 'cozy vegan restaurant',
    'community_gathering_discussing': 'vegan community gathering',
    'vegan_principles': 'vegan lifestyle philosophy',
    'passionate_discussion_on_reddit': 'vegan community discussion',
    'vegan_restaurant_menu': 'vegan restaurant dishes',
    'plant_based_dishes': 'colorful plant based food',
    'dining_experience': 'restaurant dining experience',
    'modern_urban_setting': 'modern urban restaurant',
    'vibrant_plant_based_dishes': 'vibrant vegan food plating',
    'educational_workshop': 'vegan education workshop',
    'advocacy_group': 'vegan advocacy meeting'
  };
  
  const lowerQuery = query.toLowerCase().trim();
  
  // Replace underscores with spaces for better processing
  const normalizedQuery = lowerQuery.replace(/_/g, ' ');
  
  // Check for direct mappings first
  for (const [complex, simple] of Object.entries(queryMappings)) {
    if (normalizedQuery.includes(complex)) {
      console.log(`Simplified query "${query}" -> "${simple}"`);
      return simple;
    }
  }
  
  // For simple, specific queries like "dogs", "cats", "cars", etc., keep them as-is
  if (normalizedQuery.split(/\s+/).length <= 2 && !normalizedQuery.includes('_')) {
    console.log(`🔍 SIMPLIFY OUTPUT: "${query}" -> "${normalizedQuery}" (simple query kept)`);
    return normalizedQuery;
  }
  
  // Extract key terms, keeping specific and descriptive words
  const stopWords = ['and', 'the', 'for', 'from', 'to', 'at', 'in', 'of', 'with', 'on', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being'];
  const words = normalizedQuery.split(/\s+/).filter(word => 
    word.length > 2 && 
    !stopWords.includes(word)
  );
  
  // Keep specific nouns, adjectives, and descriptive terms
  // Don't over-prioritize - let natural word order and relevance guide us
  const finalWords = words.slice(0, 4); // Allow up to 4 words for more specificity
  
  if (finalWords.length > 0) {
    const simplified = finalWords.join(' ');
    console.log(`🔍 SIMPLIFY OUTPUT: "${query}" -> "${simplified}"`);
    return simplified;
  }
  
  console.log(`🔍 SIMPLIFY OUTPUT: "${query}" -> "${query}" (unchanged)`);
  return query;
}

// Real Unsplash image search API
async function searchImages(query: string, isRefresh: boolean = false) {
  // Simplify complex queries to improve Unsplash results
  let simplifiedQuery = simplifySearchQuery(query);
  
  // Add variation for refresh requests to get different images
  if (isRefresh) {
    // Context-aware variations based on query type
    const foodRelatedTerms = ['food', 'meal', 'dish', 'recipe', 'cooking', 'restaurant', 'vegan', 'pizza', 'bread', 'soup', 'salad', 'dessert'];
    const animalRelatedTerms = ['dog', 'cat', 'bird', 'horse', 'animal', 'pet', 'wildlife'];
    const techRelatedTerms = ['phone', 'smartphone', 'computer', 'laptop', 'technology', 'device', 'gadget'];
    
    const queryLower = simplifiedQuery.toLowerCase();
    let variations: string[] = [];
    
    if (foodRelatedTerms.some(term => queryLower.includes(term))) {
      variations = ['delicious', 'fresh', 'healthy', 'organic', 'artisanal', 'gourmet', 'homemade', 'colorful', 'appetizing'];
    } else if (animalRelatedTerms.some(term => queryLower.includes(term))) {
      variations = ['cute', 'adorable', 'playful', 'beautiful', 'happy', 'friendly', 'lovely', 'charming'];
    } else if (techRelatedTerms.some(term => queryLower.includes(term))) {
      variations = ['modern', 'sleek', 'innovative', 'advanced', 'professional', 'high-tech', 'cutting-edge'];
    } else {
      // Generic variations for other topics
      variations = ['beautiful', 'stunning', 'amazing', 'incredible', 'wonderful', 'impressive', 'remarkable'];
    }
    
    const randomVariation = variations[Math.floor(Math.random() * variations.length)];
    simplifiedQuery = `${randomVariation} ${simplifiedQuery}`;
    console.log(`🔄 REFRESH: Added "${randomVariation}" variation to query: "${simplifiedQuery}"`);
  }
  
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
    console.log('🔍 UNSPLASH QUERY:', {
      originalQuery: query,
      simplifiedQuery: simplifiedQuery,
      encodedQuery: encodeURIComponent(simplifiedQuery),
      isRefresh: isRefresh,
      finalUrl: `https://api.unsplash.com/search/photos?query=${encodeURIComponent(simplifiedQuery)}&per_page=3&orientation=landscape`
    });
    
    const response = await fetch(
      `https://api.unsplash.com/search/photos?query=${encodeURIComponent(simplifiedQuery)}&per_page=3&orientation=landscape`,
      {
        headers: {
          'Authorization': `Client-ID ${unsplashAccessKey}`
        }
      }
    );
    
    if (!response.ok) {
      console.error('❌ UNSPLASH API ERROR:', response.status, response.statusText);
      throw new Error(`Unsplash API error: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('✅ UNSPLASH RESPONSE:', {
      query: simplifiedQuery,
      resultsCount: data.results?.length || 0,
      totalResults: data.total || 0,
      firstImageUrl: data.results?.[0]?.urls?.regular?.substring(0, 50) + '...' || 'none'
    });
    
    if (!data.results?.length) {
      // Try a more generic fallback search with universally relevant terms
      const fallbackTerms = ['office', 'business', 'technology', 'workspace', 'computer', 'teamwork'];
      const queryWords = simplifiedQuery.toLowerCase().split(' ');
      const matchingFallback = fallbackTerms.find(term => 
        queryWords.some(word => term.includes(word)) || 
        term.split(' ').some(termWord => queryWords.includes(termWord))
      ) || 'business'; // Default to business if no match
      
      if (matchingFallback && matchingFallback !== simplifiedQuery) {
        console.log(`No results for "${simplifiedQuery}", trying fallback: "${matchingFallback}"`);
        const fallbackResponse = await fetch(
          `https://api.unsplash.com/search/photos?query=${encodeURIComponent(matchingFallback)}&per_page=3&orientation=landscape`,
          {
            headers: {
              'Authorization': `Client-ID ${unsplashAccessKey}`
            }
          }
        );
        
        if (fallbackResponse.ok) {
          const fallbackData = await fallbackResponse.json();
          if (fallbackData.results?.length) {
            console.log(`Fallback search successful: ${fallbackData.results.length} images found for "${matchingFallback}"`);
            return fallbackData.results.map(photo => ({
              url: photo.urls.regular,
              alt: photo.alt_description || query,
              caption: photo.description || `Image for ${query} (searched: ${matchingFallback})`,
              source: `Unsplash (Photo by ${photo.user.name})`
            }));
          }
        }
      }
      
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
    const body = await req.json();
    console.log('📥 EDGE FUNCTION RECEIVED:', { 
      hasMarkdown: !!body.markdown, 
      title: body.title?.substring(0, 50) + '...', 
      customDescription: body.customDescription,
      isRefresh: body.isRefresh 
    });
    const { markdown, title, customDescription, xraySessionId, isRefresh } = body;

    if (!markdown) {
      return new Response(
        JSON.stringify({ error: 'Missing markdown content' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    console.log('📸 MEDIA AGENT:', { title, contentLength: markdown.length, customDescription, isRefresh });

    // 🎯 XRAY: Initialize conversation tracking
    const mediaAgentConversation: XrayConversation = {
      steps: [],
      messages: [],
      timing: { start: Date.now(), end: 0, duration: 0 },
      model: 'gpt-4'
    };

    // 🎯 XRAY: Step 1 - Image Marker Detection
    const semanticStart = Date.now();
    mediaAgentConversation.steps.push({
      id: 'semantic_extraction',
      type: 'logical_operation',
      name: 'Image Marker Detection',
      description: 'Scanning content for existing [IMAGE:tag] markers from Content Agent',
      timestamp: semanticStart,
      status: 'running',
      input: { 
        content_length: markdown.length,
        scan_mode: 'existing_markers',
        priority: 'use_content_agent_markers'
      }
    });

    // PHASE 0: Handle custom description if provided
    if (customDescription) {
      console.log('🔍 CUSTOM DESCRIPTION PROVIDED:', customDescription);
      
      // Create 3 spots with the custom description
      const images: { location: string; options: Awaited<ReturnType<typeof searchImages>> }[] = [];
      
      for (let i = 1; i <= 3; i++) {
        const location = `spot_${i}`;
        const options = await searchImages(customDescription, isRefresh);
        images.push({
          location,
          options
        });
      }
      
      console.log('✅ CUSTOM SEARCH COMPLETE:', images.length, 'spots created');
      
      return new Response(
        JSON.stringify({ 
          images,
          ...(xraySessionId && {
            conversations: {
              media_agent: mediaAgentConversation
            }
          })
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // PHASE 1: Check for semantic image markers first
    const semanticMarkers = extractSemanticImageMarkers(markdown);
    
    if (semanticMarkers.length > 0) {
      console.log('✅ SEMANTIC MARKERS:', semanticMarkers.length);
      
      // 🎯 XRAY: Complete semantic extraction step
      const semanticStep = mediaAgentConversation.steps.find(s => s.id === 'semantic_extraction');
      if (semanticStep) {
        semanticStep.status = 'completed';
        semanticStep.duration = Date.now() - semanticStart;
        semanticStep.output = { 
          markers_found: semanticMarkers.length,
          path_taken: 'existing_markers',
          markers_used: true
        };
        semanticStep.metadata = {
          marker_tags: semanticMarkers.map(m => m.description),
          source: 'content_agent_markers'
        };
      }

      // 🎯 XRAY: Step 2 - Image Search (Marker-Based)
      const imageSearchStart = Date.now();
      mediaAgentConversation.steps.push({
        id: 'semantic_image_search',
        type: 'logical_operation',
        name: 'Image Search (Marker-Based)',
        description: 'Searching Unsplash using Content Agent\'s image marker tags',
        timestamp: imageSearchStart,
        status: 'running',
        input: { 
          markers_to_process: semanticMarkers.length,
          search_source: 'unsplash_api',
          search_method: 'content_agent_tags'
        }
      });
      
      // Process semantic markers directly
      const images: { location: string; options: Awaited<ReturnType<typeof searchImages>> }[] = [];
      
      for (let i = 0; i < semanticMarkers.length; i++) {
        const marker = semanticMarkers[i];
        const location = `spot_${i + 1}`;
        const simplifiedQuery = simplifySearchQuery(marker.description);
        const options = await searchImages(simplifiedQuery, isRefresh);
        images.push({
          location,
          options
        });
      }

      // 🎯 XRAY: Complete image search step
      const imageSearchStep = mediaAgentConversation.steps.find(s => s.id === 'semantic_image_search');
      if (imageSearchStep) {
        imageSearchStep.status = 'completed';
        imageSearchStep.duration = Date.now() - imageSearchStart;
        imageSearchStep.output = {
          images_found: images.length,
          total_image_options: images.reduce((sum, img) => sum + img.options.length, 0)
        };
        imageSearchStep.metadata = {
          search_queries: semanticMarkers.map(m => simplifySearchQuery(m.description))
        };
      }

      // 🎯 XRAY: Finalize conversation timing
      mediaAgentConversation.timing.end = Date.now();
      mediaAgentConversation.timing.duration = mediaAgentConversation.timing.end - mediaAgentConversation.timing.start;
      
      return new Response(
        JSON.stringify({ 
          images,
          // 🎯 XRAY: Include conversation data if session ID provided
          ...(xraySessionId && {
            conversations: {
              media_agent: mediaAgentConversation
            }
          })
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // PHASE 2: No markers found - Content Agent error
    console.log('❌ NO IMAGE MARKERS FOUND - Content Agent failed to provide markers');

    // 🎯 XRAY: Complete semantic extraction step (error case)
    const semanticStep = mediaAgentConversation.steps.find(s => s.id === 'semantic_extraction');
    if (semanticStep) {
      semanticStep.status = 'failed';
      semanticStep.duration = Date.now() - semanticStart;
      semanticStep.output = { 
        markers_found: 0,
        error: 'content_agent_missing_markers',
        message: 'Content Agent failed to provide [IMAGE:...] markers'
      };
    }

    // 🎯 XRAY: Finalize conversation timing
    mediaAgentConversation.timing.end = Date.now();
    mediaAgentConversation.timing.duration = mediaAgentConversation.timing.end - mediaAgentConversation.timing.start;

    return new Response(
      JSON.stringify({ 
        error: 'No image markers found in content. Content Agent should have provided [IMAGE:...] markers.',
        code: 'MISSING_IMAGE_MARKERS',
        // 🎯 XRAY: Include conversation data if session ID provided
        ...(xraySessionId && {
          conversations: {
            media_agent: mediaAgentConversation
          }
        })
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: 'An unexpected error occurred', details: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

// New function to extract semantic image markers
function extractSemanticImageMarkers(markdown: string): { description: string; position: number }[] {
  const markers: { description: string; position: number }[] = [];
  
  // Regex to find [IMAGE:description] markers
  const imageMarkerRegex = /\[IMAGE:([^\]]+)\]/g;
  let match;
  
  while ((match = imageMarkerRegex.exec(markdown)) !== null) {
    const description = match[1].trim();
    const position = match.index;
    
    if (description) {
      markers.push({
        description,
        position
      });
    }
  }
  
  // Sort by position to maintain order
  markers.sort((a, b) => a.position - b.position);
  
  return markers;
} 