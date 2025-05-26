import { supabase } from "@/integrations/supabase/client";
import { FormData, ResearchInsight } from "@/components/content/form/types";
import { XrayService, AgentConversation } from './xrayService';

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
  // XRAY data - conversations from the edge function
  conversations?: {
    research_agent?: {
      steps: Array<{
        id: string;
        type: 'ai_conversation' | 'logical_operation';
        name: string;
        description: string;
        timestamp: number;
        duration?: number;
        status: 'running' | 'completed' | 'failed';
        messages?: Array<{
          role: 'system' | 'user' | 'assistant';
          content: string;
          timestamp: number;
        }>;
        model?: string;
        tokens?: number;
        input?: Record<string, unknown>;
        output?: Record<string, unknown>;
        metadata?: Record<string, unknown>;
      }>;
      messages: Array<{
        role: 'system' | 'user' | 'assistant';
        content: string;
        timestamp: number;
      }>;
      timing: { start: number; end: number; duration: number };
      tokens?: number;
      model: string;
    };
  };
}

export const conductResearch = async (
  query: string, 
  prompt: string, 
  company?: string
): Promise<{ insights: ResearchInsight[]; enrichedPrompt: string; totalProcessingTime: number; noInsightsReason?: string }> => {
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
      // Check if this is a "no insights found" scenario (normal outcome)
      if (data.fallback_reason && (
        data.fallback_reason.includes('No valuable insights found') ||
        data.fallback_reason.includes('No posts could be scraped') ||
        data.fallback_reason.includes('No high-quality insights found')
      )) {
        console.log('Research completed with no insights:', data.fallback_reason);
        // This is a normal outcome, not an error - continue with XRAY capture and return empty results
      } else {
        // This is an actual error
        throw new Error(data.error || data.fallback_reason || 'Research failed for unknown reason');
      }
    }
    
    // 🎯 XRAY Integration: Capture Research Agent conversations (even for "no insights" scenarios)
    if (data.conversations?.research_agent) {
      try {
        console.log('🔍 DEBUG: Research agent conversation data:', data.conversations.research_agent);
        console.log('🔍 DEBUG: Steps array:', data.conversations.research_agent.steps);
        console.log('🔍 DEBUG: Steps length:', data.conversations.research_agent.steps?.length);
        
        // Get or create current session
        const currentSession = XrayService.getCurrentSession();
        let contentId = currentSession?.contentId;
        
        if (!contentId) {
          // Create new session for this research
          contentId = `research-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          XrayService.startSession(contentId);
        }
        
        // Log Research Agent conversation
        const researchConversation: AgentConversation = {
          agentName: 'research_agent',
          order: 1,
          steps: data.conversations.research_agent.steps || [{
            id: 'research_analysis_fallback',
            type: 'ai_conversation',
            name: 'Research Analysis (Legacy)',
            description: 'AI analyzes Reddit discussions to find authentic user insights',
            timestamp: Date.now(),
            duration: data.conversations.research_agent.timing?.duration || 0,
            status: 'completed',
            messages: data.conversations.research_agent.messages,
            model: data.conversations.research_agent.model,
            tokens: data.conversations.research_agent.tokens
          }],
          messages: data.conversations.research_agent.messages.map(msg => ({
            role: msg.role,
            content: msg.content,
            timestamp: msg.timestamp
          })),
          timing: data.conversations.research_agent.timing,
          tokens: data.conversations.research_agent.tokens,
          model: data.conversations.research_agent.model
        };
        
        console.log('🔍 DEBUG: Final research conversation object:', researchConversation);
        console.log('🔍 DEBUG: Final steps count:', researchConversation.steps.length);
        
        XrayService.logConversation(contentId, researchConversation);
        
        // Log data flow - research enriches the original prompt
        XrayService.logDataFlow(contentId, {
          from: 'user_input',
          to: 'research_agent',
          data: { 
            originalPrompt: request.prompt,
            companyContext: request.company_description 
          },
          summary: `User prompt and company context provided to Research Agent for Reddit insight discovery`
        });
        
        if (data.enriched_prompt) {
          XrayService.logDataFlow(contentId, {
            from: 'research_agent',
            to: 'content_generator',
            data: { 
              enrichedPrompt: data.enriched_prompt,
              insightSummary: data.insight_summary,
              redditSource: data.reddit_post_url
            },
            summary: `Research Agent enriched the prompt with Reddit community insights and authentic terminology`
          });
        }
        
        console.log('✅ XRAY: Research Agent conversation captured');
      } catch (xrayError) {
        console.error('❌ XRAY: Failed to capture research conversation:', xrayError);
        // Don't fail the research if XRAY capture fails
      }
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
      totalProcessingTime: data.processing_time_seconds || 0,
      // Include fallback reason for "no insights" scenarios
      ...(data.fallback_reason && !data.success && {
        noInsightsReason: data.fallback_reason
      })
    };
  } catch (error) {
    console.error('Error conducting research:', error);
    throw error;
  }
}; 