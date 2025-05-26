import { supabase } from '@/integrations/supabase/client';

export interface MediaImageOption {
  url: string;
  alt: string;
  caption: string;
  source: string;
}

export interface MediaImageSpot {
  location: string;
  options: MediaImageOption[];
}

export interface MediaAgentResponse {
  images: MediaImageSpot[];
  error?: string;
  code?: string;
  conversations?: {
    media_agent?: {
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

export interface MediaAgentParams {
  markdown: string;
  title: string;
  customDescription?: string;
  xraySessionId?: string;
  isRefresh?: boolean;
}

export const getMediaSuggestions = async (params: MediaAgentParams): Promise<{ images: MediaImageSpot[]; conversations?: any }> => {
  try {
    const { data, error } = await supabase.functions.invoke('media-agent', {
      body: params
    });

    if (error) {
      throw new Error(error.message || 'Failed to get media suggestions');
    }

    if (data.error) {
      const errorWithConversations = new Error(data.error);
      // Preserve XRAY conversations even in error cases
      if (data.conversations) {
        (errorWithConversations as any).conversations = data.conversations;
      }
      
      if (data.code === 'OPENAI_RATE_LIMIT') {
        errorWithConversations.message = 'OpenAI API rate limit reached. Please wait a few seconds and try again.';
      }
      throw errorWithConversations;
    }

    return {
      images: data.images || [],
      conversations: data.conversations
    };
  } catch (error: any) {
    console.error('Error in getMediaSuggestions:', error);
    throw error;
  }
}; 