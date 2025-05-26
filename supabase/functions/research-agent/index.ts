import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { RedditScraper } from "./reddit-scraper.ts";
import { SubredditDiscovery, SubredditDiscoveryResult } from "./subreddit-discovery.ts";
import { 
  ResearchRequest, 
  ResearchResponse, 
  RedditPost, 
  SubredditInfo,
  ScrapingMetadata,
  ResearchError,
  XrayMessage,
  XrayStep,
  XrayConversation
} from "./types.ts";

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const openAIApiKey = Deno.env.get('OPENAI_API_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Global conversation tracker for XRAY
let researchAgentConversation: XrayConversation;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = performance.now();
  let redditScraper: RedditScraper | null = null;
  
  // 🎯 XRAY: Initialize conversation tracking
  researchAgentConversation = {
    steps: [],
    messages: [],
    timing: { start: Date.now(), end: 0, duration: 0 },
    model: 'gpt-4o-mini'
  };
  
  try {
    console.log(`[${new Date().toISOString()}] Research Agent request received`);

    // Parse request body
    const requestBody = await req.json();
    const { prompt, company_description, enable_research } = requestBody as ResearchRequest;

    // Validate input
    if (!prompt || typeof prompt !== 'string') {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Valid prompt is required',
          processing_time_seconds: (performance.now() - startTime) / 1000
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    if (!company_description || typeof company_description !== 'string') {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Valid company description is required',
          processing_time_seconds: (performance.now() - startTime) / 1000
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Check if research is disabled
    if (!enable_research) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          fallback_reason: 'Research agent disabled by user',
          processing_time_seconds: (performance.now() - startTime) / 1000
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Check for required environment variables
    if (!openAIApiKey) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'OpenAI API key not configured',
          processing_time_seconds: (performance.now() - startTime) / 1000
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    console.log(`Starting research for prompt: "${prompt.substring(0, 100)}..."`);

    // 🎯 XRAY: Step 1 - Subreddit Discovery
    const subredditDiscoveryStart = Date.now();

    // Step 1: Discover relevant subreddits
    const discovery = new SubredditDiscovery();
    const discoveryResult = await discovery.discoverSubreddits(prompt, company_description);
    const subreddits = discoveryResult.subreddits;
    
    // 🎯 XRAY: Track step based on whether AI was used or cache was hit
    if (discoveryResult.conversationData?.messages && discoveryResult.conversationData.messages.length > 0) {
      // AI conversation - track as ai_conversation (this is the normal case)
      researchAgentConversation.steps.push({
        id: 'subreddit_discovery',
        type: 'ai_conversation',
        name: 'Subreddit Discovery',
        description: 'AI identifies relevant subreddits for the topic using GPT-4o-mini',
        timestamp: subredditDiscoveryStart,
        status: 'completed',
        duration: Date.now() - subredditDiscoveryStart,
        messages: discoveryResult.conversationData.messages,
        model: 'gpt-4o-mini',
        tokens: discoveryResult.conversationData.tokens || 0
      });
      
      // 🎯 XRAY: Track token usage
      if (discoveryResult.conversationData.tokens) {
        researchAgentConversation.tokens = (researchAgentConversation.tokens || 0) + discoveryResult.conversationData.tokens;
      }
    } else if (discoveryResult.conversationData?.usedCache) {
      // Cache hit - track as logical operation (rare case when cache is implemented)
      researchAgentConversation.steps.push({
        id: 'subreddit_discovery',
        type: 'logical_operation',
        name: 'Subreddit Discovery',
        description: 'Retrieved relevant subreddits from cache (no AI call needed)',
        timestamp: subredditDiscoveryStart,
        status: 'completed',
        duration: Date.now() - subredditDiscoveryStart,
        input: { query: prompt, company: company_description },
        output: { subreddits_found: subreddits.length, source: 'cache' },
        metadata: { cache_hit: true, subreddits: subreddits.map(s => s.name) }
      });
    } else {
      // Fallback used - track as logical operation
      const fallbackSubreddits = await discovery.discoverSubreddits(prompt, company_description);
      researchAgentConversation.steps.push({
        id: 'subreddit_discovery',
        type: 'logical_operation',
        name: 'Subreddit Discovery',
        description: 'Used fallback subreddits (AI discovery failed)',
        timestamp: subredditDiscoveryStart,
        status: 'completed',
        duration: Date.now() - subredditDiscoveryStart,
        input: { query: prompt, company: company_description },
        output: { subreddits_found: fallbackSubreddits.subreddits.length, source: 'fallback' },
        metadata: { fallback_used: true, reason: 'AI discovery failed' }
      });
    }
    
    if (subreddits.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          fallback_reason: 'No relevant subreddits found',
          processing_time_seconds: (performance.now() - startTime) / 1000
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    console.log(`Found ${subreddits.length} relevant subreddits:`, subreddits.map(s => s.name));

    // Initialize Reddit scraper
    redditScraper = new RedditScraper();

    // 🎯 XRAY: Step 2 - Reddit Scraping
    const scrapingStart = Date.now();
    researchAgentConversation.steps.push({
      id: 'reddit_scraping',
      type: 'logical_operation',
      name: 'Reddit Scraping',
      description: 'Scraping posts from discovered subreddits using Reddit API',
      timestamp: scrapingStart,
      status: 'running',
      input: { subreddits_to_scrape: Math.min(5, subreddits.length), posts_per_subreddit: 3 }
    });

    // Scrape posts from discovered subreddits
    const allPosts: RedditPost[] = [];
    const scrapingDetails: { [subreddit: string]: { posts: number; titles: string[]; errors?: string } } = {};
    
    for (const subreddit of subreddits) {
      try {
        console.log(`Scraping r/${subreddit.name}...`);
        
        // Skip validation - go directly to scraping
        // Reddit's post API might be more permissive than the about API
        const posts = await redditScraper.scrapeSubredditPosts(subreddit.name, 3);
        
        if (posts.length > 0) {
          console.log(`Successfully scraped ${posts.length} posts from r/${subreddit.name}`);
          allPosts.push(...posts);
          
          // 🎯 XRAY: Capture detailed scraping information
          scrapingDetails[subreddit.name] = {
            posts: posts.length,
            titles: posts.map(p => p.title.substring(0, 80) + (p.title.length > 80 ? '...' : ''))
          };
        } else {
          console.log(`No posts found in r/${subreddit.name}`);
          scrapingDetails[subreddit.name] = {
            posts: 0,
            titles: [],
            errors: 'No posts found'
          };
        }
        
      } catch (error) {
        console.error(`Error scraping r/${subreddit.name}:`, error);
        scrapingDetails[subreddit.name] = {
          posts: 0,
          titles: [],
          errors: error.message || 'Scraping failed'
        };
        continue; // Continue with next subreddit
      }
    }

    // 🎯 XRAY: Complete Reddit scraping step with detailed information
    const scrapingEnd = Date.now();
    const scrapingStep = researchAgentConversation.steps.find(s => s.id === 'reddit_scraping');
    if (scrapingStep) {
      scrapingStep.status = allPosts.length > 0 ? 'completed' : 'failed';
      scrapingStep.duration = scrapingEnd - scrapingStart;
      scrapingStep.output = { 
        posts_found: allPosts.length, 
        subreddits_scraped: Object.keys(scrapingDetails).filter(s => scrapingDetails[s].posts > 0).length,
        subreddit_breakdown: scrapingDetails,
        top_posts: allPosts.slice(0, 5).map(post => ({
          title: post.title.substring(0, 100) + (post.title.length > 100 ? '...' : ''),
          subreddit: post.subreddit,
          upvotes: post.upvotes,
          comments: post.comments_count,
          url: post.url
        }))
      };
      scrapingStep.metadata = {
        subreddits_attempted: subreddits.length,
        total_subreddits_discovered: subreddits.length,
        successful_subreddits: Object.keys(scrapingDetails).filter(s => scrapingDetails[s].posts > 0).length,
        failed_subreddits: Object.keys(scrapingDetails).filter(s => scrapingDetails[s].posts === 0).length,
        average_posts_per_subreddit: allPosts.length > 0 ? (allPosts.length / Object.keys(scrapingDetails).filter(s => scrapingDetails[s].posts > 0).length).toFixed(1) : 0
      };
    }

    if (allPosts.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          fallback_reason: 'No posts could be scraped from any subreddit',
          processing_time_seconds: (performance.now() - startTime) / 1000
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    console.log(`Total posts collected: ${allPosts.length}`);

    // Step 3: Run insight classification on collected posts
    const candidates = await classifyInsights(allPosts, prompt, company_description);
    const scrapingMetadata: ScrapingMetadata = {
      subreddits_checked: subreddits.map(s => s.name),
      posts_scraped: allPosts.length,
      candidates_found: candidates.length,
      scraping_errors: [],
      rate_limit_delays: 0
    };

    if (candidates.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          fallback_reason: 'No valuable insights found in scraped posts',
          processing_time_seconds: (performance.now() - startTime) / 1000
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    console.log(`Found ${candidates.length} candidate posts for deep analysis`);

    // Step 4: Scrape full threads for top candidates and generate enriched prompt
    const bestInsight = await findBestInsight(redditScraper, candidates, prompt, company_description);

    if (!bestInsight) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          fallback_reason: 'No high-quality insights found after deep analysis',
          processing_time_seconds: (performance.now() - startTime) / 1000
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    const processingTime = (performance.now() - startTime) / 1000;
    
    // 🎯 XRAY: Finalize conversation timing
    researchAgentConversation.timing.end = Date.now();
    researchAgentConversation.timing.duration = researchAgentConversation.timing.end - researchAgentConversation.timing.start;
    
    console.log(`Research completed successfully in ${processingTime.toFixed(2)} seconds`);
    console.log(`✅ XRAY: Captured ${researchAgentConversation.steps.length} steps`);

    // Return successful research result with XRAY data
    const response: ResearchResponse = {
      success: true,
      enriched_prompt: bestInsight.enriched_prompt,
      insight_summary: bestInsight.insight_summary,
      reddit_post_url: bestInsight.reddit_post_url,
      reddit_post_title: bestInsight.reddit_post_title,
      processing_time_seconds: processingTime,
      // 🎯 XRAY: Include conversations in response
      conversations: {
        research_agent: researchAgentConversation
      }
    };

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('Research Agent error:', error);
    
    const processingTime = (performance.now() - startTime) / 1000;
    const errorResponse: ResearchResponse = {
      success: false,
      error: error.message || 'Unknown error occurred',
      processing_time_seconds: processingTime
    };

    return new Response(
      JSON.stringify(errorResponse),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );

  } finally {
    // Cleanup scraper resources
    if (redditScraper) {
      await redditScraper.cleanup();
    }
  }
});

// Step 3 Helper: Classify insights using LLM
async function classifyInsights(
  posts: RedditPost[], 
  prompt: string, 
  company: string
): Promise<{ post_id: string; insight_summary: string; relevance_score: number }[]> {
  try {
    // Get prompt templates (fallback to hardcoded if not found)
    const [systemResult, userResult] = await Promise.all([
      supabase
        .from('content_templates')
        .select('system_prompt')
        .eq('name', 'research_classification_system')
        .maybeSingle(),
      supabase
      .from('content_templates')
      .select('user_prompt')
      .eq('name', 'research_insight_classification')
        .maybeSingle()
    ]);

    const systemPrompt = systemResult.data?.system_prompt || 'You are an expert at analyzing Reddit posts to identify valuable insights for content creation. Always respond with valid JSON only.';
    const promptTemplate = userResult.data?.user_prompt || getFallbackClassificationPrompt();

    // Prepare posts data for LLM analysis (limit to avoid token limits)
    const postsForAnalysis = posts.slice(0, 20).map(post => ({
      id: post.id,
      title: post.title,
      body: post.body.substring(0, 500), // Limit body length
      upvotes: post.upvotes,
      comments_count: post.comments_count
    }));

    const userPrompt = promptTemplate
      .replace('{{prompt}}', prompt)
      .replace('{{company_description}}', company)
      .replace('{{posts_batch}}', JSON.stringify(postsForAnalysis));

    // 🎯 XRAY: Start Post Classification step
    const classificationStart = Date.now();
    const classificationStep: XrayStep = {
      id: 'post_classification',
      type: 'ai_conversation',
      name: 'Post Classification',
      description: 'AI analyzes scraped posts to identify valuable insights',
      timestamp: classificationStart,
      status: 'running',
      messages: [
        { role: 'system', content: systemPrompt, timestamp: classificationStart },
        { role: 'user', content: userPrompt, timestamp: classificationStart + 100 }
      ],
      model: 'gpt-4o-mini'
    };
    researchAgentConversation.steps.push(classificationStep);

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
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
            content: systemPrompt
          },
          {
            role: 'user',
            content: userPrompt
          }
        ],
        temperature: 0.3,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;

    // 🎯 XRAY: Complete Post Classification step
    const classificationEnd = Date.now();
    classificationStep.messages!.push({ 
      role: 'assistant', 
      content: content, 
      timestamp: classificationEnd 
    });
    classificationStep.status = 'completed';
    classificationStep.duration = classificationEnd - classificationStart;
    classificationStep.tokens = data.usage?.total_tokens || 0;

    // 🎯 XRAY: Track token usage if available
    if (data.usage?.total_tokens) {
      researchAgentConversation.tokens = (researchAgentConversation.tokens || 0) + data.usage.total_tokens;
    }

    try {
      // Handle markdown code blocks if present
      let cleanContent = content.trim();
      
      // Remove markdown code block delimiters if present
      if (cleanContent.startsWith('```json')) {
        cleanContent = cleanContent.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (cleanContent.startsWith('```')) {
        cleanContent = cleanContent.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }
      
      const candidates = JSON.parse(cleanContent);
      return Array.isArray(candidates) ? candidates.slice(0, 3) : [];
    } catch (parseError) {
      console.error("Failed to parse classification response:", content);
      return [];
    }

  } catch (error) {
    console.error("Error in insight classification:", error);
    return [];
  }
}

// Step 4 Helper: Find the best insight by analyzing full threads
async function findBestInsight(
  scraper: RedditScraper,
  candidates: { post_id: string; insight_summary: string; relevance_score: number }[],
  prompt: string,
  company: string
): Promise<{
  enriched_prompt: string;
  insight_summary: string;
  reddit_post_url: string;
  reddit_post_title: string;
} | null> {
  
  // 🎯 XRAY: Start Thread Analysis step
  const threadAnalysisStart = Date.now();
  const threadAnalysisStep: XrayStep = {
    id: 'thread_analysis',
    type: 'logical_operation',
    name: 'Thread Analysis',
    description: 'Analyzing full Reddit threads for deep insights',
    timestamp: threadAnalysisStart,
    status: 'running',
    input: { 
      candidates_to_analyze: candidates.length,
      analysis_depth: 'full_thread_with_comments'
    }
  };
  researchAgentConversation.steps.push(threadAnalysisStep);
  
  for (const candidate of candidates.slice(0, 2)) { // Limit to top 2 to avoid timeouts
    try {
      // Find the full post object
      const fullPost = await scraper.scrapeFullThread(`https://www.reddit.com/comments/${candidate.post_id}`);
      
      if (!fullPost || fullPost.comments.length === 0) {
        continue;
      }

      // Analyze the full thread with LLM
      const enrichedResult = await enrichPromptFromThread(fullPost, prompt, company);
      
      if (enrichedResult && enrichedResult.confidence_score >= 7) {
        // 🎯 XRAY: Complete Thread Analysis step
        const threadAnalysisEnd = Date.now();
        threadAnalysisStep.status = 'completed';
        threadAnalysisStep.duration = threadAnalysisEnd - threadAnalysisStart;
        threadAnalysisStep.output = {
          best_thread_found: true,
          thread_url: fullPost.url,
          confidence_score: enrichedResult.confidence_score,
          enriched_prompt_length: enrichedResult.enriched_prompt.length
        };
        threadAnalysisStep.metadata = {
          threads_analyzed: 1,
          comments_in_thread: fullPost.comments.length
        };

        return {
          enriched_prompt: enrichedResult.enriched_prompt,
          insight_summary: candidate.insight_summary,
          reddit_post_url: fullPost.url,
          reddit_post_title: fullPost.title
        };
      }

    } catch (error) {
      console.error(`Error analyzing candidate ${candidate.post_id}:`, error);
      continue;
    }
  }

  // 🎯 XRAY: Mark Thread Analysis as failed
  const threadAnalysisEnd = Date.now();
  threadAnalysisStep.status = 'failed';
  threadAnalysisStep.duration = threadAnalysisEnd - threadAnalysisStart;
  threadAnalysisStep.output = { best_thread_found: false };
  threadAnalysisStep.metadata = { 
    threads_analyzed: candidates.slice(0, 2).length,
    failure_reason: 'No threads met confidence score threshold' 
  };

  return null;
}

// Helper: Enrich prompt from full thread
async function enrichPromptFromThread(thread: any, prompt: string, company: string): Promise<any> {
  try {
    // 🎯 XRAY: Start Prompt Enrichment step
    const enrichmentStart = Date.now();
    
    const [systemResult, userResult] = await Promise.all([
      supabase
        .from('content_templates')
        .select('system_prompt')
        .eq('name', 'research_enrichment_system')
        .maybeSingle(),
      supabase
      .from('content_templates')
      .select('user_prompt')
      .eq('name', 'research_prompt_enrichment')
        .maybeSingle()
    ]);

    const systemPrompt = systemResult.data?.system_prompt || 'You are an expert content strategist who enriches content prompts with authentic user insights. Always respond with valid JSON only.';
    const promptTemplate = userResult.data?.user_prompt || getFallbackEnrichmentPrompt();

    // Prepare thread data (limit content to avoid token limits)
    const threadContent = {
      title: thread.title,
      body: thread.body.substring(0, 1000),
      comments: thread.comments.slice(0, 10).map((c: any) => ({
        body: c.body.substring(0, 300),
        upvotes: c.upvotes
      }))
    };

    const userPrompt = promptTemplate
      .replace('{{original_prompt}}', prompt)
      .replace('{{company_description}}', company)
      .replace('{{full_thread}}', JSON.stringify(threadContent));

    // 🎯 XRAY: Create Prompt Enrichment step
    const enrichmentStep: XrayStep = {
      id: `prompt_enrichment_${Date.now()}`,
      type: 'ai_conversation',
      name: 'Prompt Enrichment',
      description: 'AI enriches the original prompt with Reddit insights',
      timestamp: enrichmentStart,
      status: 'running',
      messages: [
        { role: 'system', content: systemPrompt, timestamp: enrichmentStart },
        { role: 'user', content: userPrompt, timestamp: enrichmentStart + 100 }
      ],
      model: 'gpt-4o-mini'
    };
    researchAgentConversation.steps.push(enrichmentStep);

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
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
            content: systemPrompt
          },
          {
            role: 'user',
            content: userPrompt
          }
        ],
        temperature: 0.4,
        max_tokens: 1500,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;

    // 🎯 XRAY: Complete Prompt Enrichment step
    const enrichmentEnd = Date.now();
    enrichmentStep.messages!.push({ 
      role: 'assistant', 
      content: content, 
      timestamp: enrichmentEnd 
    });
    enrichmentStep.status = 'completed';
    enrichmentStep.duration = enrichmentEnd - enrichmentStart;
    enrichmentStep.tokens = data.usage?.total_tokens || 0;

    // 🎯 XRAY: Track token usage if available
    if (data.usage?.total_tokens) {
      researchAgentConversation.tokens = (researchAgentConversation.tokens || 0) + data.usage.total_tokens;
    }

    return JSON.parse(content);

  } catch (error) {
    console.error("Error in prompt enrichment:", error);
    return null;
  }
}

// Fallback prompts if database templates are not available
function getFallbackClassificationPrompt(): string {
  return `Analyze these Reddit posts for the topic "{{prompt}}" and company "{{company_description}}".

Select up to 3 posts that contain:
- Original insights, pain points, or novel perspectives
- Relevance to the given prompt and company context
- Non-generic content not widely covered elsewhere

Posts to analyze:
{{posts_batch}}

Return as JSON array:
[
  {
    "post_id": "abc123",
    "insight_summary": "Brief summary of the insight",
    "selection_reason": "Why this post was selected",
    "relevance_score": 8.5
  }
]`;
}

function getFallbackEnrichmentPrompt(): string {
  return `Analyze this Reddit thread for powerful insights to form a blog post core.

Original prompt: {{original_prompt}}
Company context: {{company_description}}

Reddit thread:
{{full_thread}}

Generate a detailed blog prompt including user insights. Return as JSON:
{
  "enriched_prompt": "The detailed enriched prompt text",
  "key_insights": ["insight1", "insight2"],
  "user_language": ["term1", "term2"],
  "sentiment": "frustrated/excited/concerned/etc",
  "confidence_score": 8.5
}`;
} 