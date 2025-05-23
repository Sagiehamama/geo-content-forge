import { supabase } from "@/integrations/supabase/client";
import { ResearchInsight } from "@/components/content/form/types";

export interface ResearchRequest {
  prompt: string;
  company_description: string;
  enable_research: boolean;
}

export interface ResearchResponse {
  success: boolean;
  enriched_prompt?: string;
  insight_summary?: string;
  reddit_post_url?: string;
  reddit_post_title?: string;
  processing_time_seconds: number;
  error?: string;
  fallback_reason?: string;
}

export const conductResearch = async (
  query: string, 
  prompt: string, 
  company?: string
): Promise<{ insights: ResearchInsight[]; enrichedPrompt: string; totalProcessingTime: number }> => {
  try {
    console.log('Calling research agent with:', { query, prompt, company });
    
    const request: ResearchRequest = {
      prompt: query || prompt, // Use query if provided, otherwise use prompt
      company_description: company || "A technology company focused on content creation", // Default company description
      enable_research: true
    };
    
    const { data, error } = await supabase.functions.invoke("research-agent", {
      body: request,
    });
    
    if (error) {
      console.error('Error calling research-agent function:', error);
      throw new Error(`Research failed: ${error.message}`);
    }
    
    if (!data) {
      console.error('No data returned from research-agent function');
      throw new Error('No research data was returned. Please try again.');
    }

    console.log('Research completed successfully:', data);
    
    // Handle fallback cases (research disabled or failed)
    if (!data.success) {
      if (data.fallback_reason) {
        console.log('Research fallback:', data.fallback_reason);
        throw new Error(`Research unavailable: ${data.fallback_reason}`);
      }
      throw new Error(data.error || 'Research failed for unknown reason');
    }
    
    // Convert the research response to our expected format
    const insights: ResearchInsight[] = data.insight_summary ? [{
      id: Math.random().toString(36),
      insight: data.insight_summary,
      relevanceScore: 8.5, // Default score since we don't get this from the function
      source: 'Reddit',
      sourceUrl: data.reddit_post_url || '',
      postTitle: data.reddit_post_title || '',
      threadAnalysis: data.insight_summary,
      keywords: [] // Extract from insight if needed
    }] : [];
    
    return {
      insights,
      enrichedPrompt: data.enriched_prompt || prompt,
      totalProcessingTime: data.processing_time_seconds || 0
    };
  } catch (error) {
    console.error('Error in conductResearch:', error);
    throw error;
  }
}; 