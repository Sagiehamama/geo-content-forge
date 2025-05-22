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
}

export async function getMediaSuggestions({ markdown, title, tags, summary }:{ markdown: string, title?: string, tags?: string[], summary?: string }): Promise<MediaImageSpot[]> {
  try {
    const { data, error } = await supabase.functions.invoke('media-agent', {
      body: { markdown, title, tags, summary },
    });
    if (error) throw new Error(error.message || 'Failed to get media suggestions');
    if (!data || !data.images) throw new Error('No image suggestions returned');
    return data.images;
  } catch (err: any) {
    throw new Error(err.message || 'An unexpected error occurred while fetching media suggestions.');
  }
} 