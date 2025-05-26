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
              finalUrl: `https://api.unsplash.com/search/photos?query=${encodeURIComponent(simplifiedQuery)}&per_page=15&orientation=landscape`
    });
    
    const response = await fetch(
      `https://api.unsplash.com/search/photos?query=${encodeURIComponent(simplifiedQuery)}&per_page=15&orientation=landscape`,
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

    // PHASE 2: No markers found - Use AI analysis fallback for search queries
    console.log('⚠️ NO IMAGE MARKERS FOUND - Using AI analysis fallback to generate search queries');

    // 🎯 XRAY: Complete semantic extraction step (fallback case)
    const semanticStep = mediaAgentConversation.steps.find(s => s.id === 'semantic_extraction');
    if (semanticStep) {
      semanticStep.status = 'completed';
      semanticStep.duration = Date.now() - semanticStart;
      semanticStep.output = { 
        markers_found: 0,
        path_taken: 'ai_analysis_fallback',
        markers_used: false
      };
      semanticStep.metadata = {
        fallback_reason: 'content_agent_missing_markers',
        source: 'ai_content_analysis'
      };
    }

    // 🎯 XRAY: Step 2 - AI Content Analysis (Fallback)
    const aiAnalysisStart = Date.now();
    mediaAgentConversation.steps.push({
      id: 'ai_content_analysis',
      type: 'ai_conversation',
      name: 'AI Content Analysis (Fallback)',
      description: 'AI analyzes content to generate search queries for image discovery',
      timestamp: aiAnalysisStart,
      status: 'running',
      input: { 
        content_length: markdown.length,
        analysis_mode: 'search_query_generation',
        fallback_reason: 'no_content_agent_markers'
      }
    });

    // Use AI to analyze content and generate ONE unified search query
    const aiAnalysisPrompt = `You are a specialized Media Selection Agent. Analyze the provided content and generate ONE unified search query that captures the main topic for finding relevant images.

CONTENT TO ANALYZE:
${markdown}

INSTRUCTIONS:
1. Identify the MAIN topic/theme of the content
2. Generate ONE SIMPLE, DIRECT search query (1-3 words max)
3. Focus on the core subject that would be visually relevant throughout the article
4. Avoid style terms like "professional" or "high-quality"
5. Convert brand names to conceptual terms
6. Choose a term that would provide good variety of related images

RESPOND WITH ONLY A JSON OBJECT:
{"search_query": "main topic term"}`;

    try {
      const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAIApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: 'You are a specialized Media Selection Agent that generates simple search queries for image discovery. Always respond with valid JSON only.'
            },
            {
              role: 'user',
              content: aiAnalysisPrompt
            }
          ],
          temperature: 0.3,
          max_tokens: 200
        }),
      });

      if (!openaiResponse.ok) {
        throw new Error(`OpenAI API error: ${openaiResponse.status}`);
      }

      const openaiData = await openaiResponse.json();
      const aiResponse = openaiData.choices[0].message.content;

      // 🎯 XRAY: Log AI conversation
      const aiMessages: XrayMessage[] = [
        {
          role: 'system',
          content: 'You are a specialized Media Selection Agent that generates simple search queries for image discovery. Always respond with valid JSON only.',
          timestamp: Date.now()
        },
        {
          role: 'user',
          content: aiAnalysisPrompt,
          timestamp: Date.now()
        },
        {
          role: 'assistant',
          content: aiResponse,
          timestamp: Date.now()
        }
      ];

      mediaAgentConversation.messages.push(...aiMessages);
      mediaAgentConversation.tokens = (mediaAgentConversation.tokens || 0) + (openaiData.usage?.total_tokens || 0);

      // Parse AI response to get the unified search query
      const searchQueryResponse = JSON.parse(aiResponse);
      const unifiedQuery = searchQueryResponse.search_query;
      
      // 🎯 XRAY: Complete AI analysis step
      const aiAnalysisStep = mediaAgentConversation.steps.find(s => s.id === 'ai_content_analysis');
      if (aiAnalysisStep) {
        aiAnalysisStep.status = 'completed';
        aiAnalysisStep.duration = Date.now() - aiAnalysisStart;
        aiAnalysisStep.messages = aiMessages;
        aiAnalysisStep.model = 'gpt-4o-mini';
        aiAnalysisStep.tokens = openaiData.usage?.total_tokens || 0;
        aiAnalysisStep.output = {
          unified_query: unifiedQuery,
          approach: 'single_query_multiple_spots'
        };
      }

      // 🎯 XRAY: Step 3 - Unified Image Search
      const imageSearchStart = Date.now();
      mediaAgentConversation.steps.push({
        id: 'unified_image_search',
        type: 'logical_operation',
        name: 'Unified Image Search',
        description: 'Searching Unsplash using single unified query for consistent image pool',
        timestamp: imageSearchStart,
        status: 'running',
        input: { 
          unified_query: unifiedQuery,
          search_source: 'unsplash_api',
          search_method: 'unified_query_approach',
          images_per_query: 15,
          spots_to_create: 3
        }
      });

      // Search for images using the unified query (10 images)
      const simplifiedQuery = simplifySearchQuery(unifiedQuery);
      const imageOptions = await searchImages(simplifiedQuery, isRefresh);
      
      // Create 3 spots, each with the same pool of 10 images for user selection
      const images: { location: string; options: Awaited<ReturnType<typeof searchImages>> }[] = [];
      
      for (let i = 1; i <= 3; i++) {
        images.push({
          location: `spot_${i}`,
          options: imageOptions // Same 10 images for each spot
        });
      }

      // 🎯 XRAY: Complete image search step
      const imageSearchStep = mediaAgentConversation.steps.find(s => s.id === 'unified_image_search');
      if (imageSearchStep) {
        imageSearchStep.status = 'completed';
        imageSearchStep.duration = Date.now() - imageSearchStart;
        imageSearchStep.output = {
          spots_created: images.length,
          images_per_spot: imageOptions.length,
          total_image_options: images.length * imageOptions.length,
          unified_approach: true
        };
        imageSearchStep.metadata = {
          unified_query: unifiedQuery,
          simplified_query: simplifiedQuery,
          approach: 'same_pool_all_spots'
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

    } catch (aiError) {
      console.error('AI analysis failed:', aiError);
      
      // 🎯 XRAY: Mark AI analysis as failed
      const aiAnalysisStep = mediaAgentConversation.steps.find(s => s.id === 'ai_content_analysis');
      if (aiAnalysisStep) {
        aiAnalysisStep.status = 'failed';
        aiAnalysisStep.duration = Date.now() - aiAnalysisStart;
        aiAnalysisStep.output = { error: aiError.message };
      }

      // 🎯 XRAY: Finalize conversation timing
      mediaAgentConversation.timing.end = Date.now();
      mediaAgentConversation.timing.duration = mediaAgentConversation.timing.end - mediaAgentConversation.timing.start;

      return new Response(
        JSON.stringify({ 
          error: 'AI analysis failed to generate search queries',
          code: 'AI_ANALYSIS_FAILED',
          details: aiError.message,
          // 🎯 XRAY: Include conversation data if session ID provided
          ...(xraySessionId && {
            conversations: {
              media_agent: mediaAgentConversation
            }
          })
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }
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