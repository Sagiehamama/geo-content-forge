import { FormData, GeneratedContent } from "@/components/content/form/types";
import { supabase } from "@/integrations/supabase/client";
import { Json } from "@/integrations/supabase/types";
import { toast } from "sonner";
import { conductResearch } from "./researchService";

// Generate content using Edge Function
export const generateContent = async (formData: FormData): Promise<GeneratedContent | null> => {
  try {
    console.log('Sending request to generate content with data:', formData);
    
    let enrichedPrompt = formData.prompt;
    let researchInsights: any[] = [];
    
    // Conduct research if enabled
    if (formData.enableResearch) {
      try {
        console.log('Research enabled - conducting Reddit research...');
        const researchQuery = formData.researchQuery || formData.prompt;
        const researchResult = await conductResearch(
          researchQuery,
          formData.prompt,
          formData.company
        );
        
        enrichedPrompt = researchResult.enrichedPrompt;
        researchInsights = researchResult.insights;
        
        console.log(`Research completed: ${researchInsights.length} insights found`);
        toast.success(`Research completed: ${researchInsights.length} insights discovered`);
      } catch (researchError) {
        console.error('Research failed, continuing with original prompt:', researchError);
        toast.error('Research failed, generating content with original prompt');
        // Continue with original prompt if research fails
      }
    }
    
    // Call the Supabase Edge Function with enriched prompt
    const { data, error } = await supabase.functions.invoke("generate-content", {
      body: { 
        formData: {
          ...formData,
          prompt: enrichedPrompt
        }
      },
    });
    
    if (error) {
      console.error('Error calling generate-content function:', error);
      throw new Error(`Failed to generate content: ${error.message}`);
    }
    
    if (!data) {
      console.error('No data returned from generate-content function');
      throw new Error('No content was generated. Please try again.');
    }

    // Handle specific error codes from the edge function
    if (data.code === 'OPENAI_QUOTA_ERROR') {
      toast.error('OpenAI API quota exceeded. Please check your OpenAI billing and credits.');
      throw new Error(data.error);
    }

    if (data.code === 'OPENAI_API_ERROR') {
      toast.error('Error calling OpenAI API. Please try again later.');
      throw new Error(data.error);
    }

    if (data.code === 'UNKNOWN_ERROR') {
      toast.error('An unexpected error occurred. Please try again.');
      throw new Error(data.error);
    }

    // Check for specific missing OpenAI API key error
    if (data.missingKey) {
      toast.error('The OpenAI API key is not configured in the server environment. Please contact the administrator.');
      throw new Error('OpenAI API key not configured. Please contact the administrator.');
    }

    console.log('Content generated successfully:', data);

    // Store the content request and result in the database
    const dbIds = await storeContentRequest(formData, data);
    
    return {
      ...data,
      id: dbIds.generatedContentId,
      requestId: dbIds.requestId,
      images: data.images || [],
      researchInsights: researchInsights,
    };
  } catch (error) {
    console.error('Error in generateContent:', error);
    throw error;
  }
};

// Store content request in database
const storeContentRequest = async (formData: FormData, generatedContent: GeneratedContent): Promise<{ requestId: string, generatedContentId: string }> => {
  try {
    // First, insert the content request
    const { data: requestData, error: requestError } = await supabase
      .from('content_requests')
      .insert({
        prompt: formData.prompt,
        company: formData.company,
        language: formData.language,
        country: formData.country,
        tone: formData.tone,
        tone_type: formData.toneType,
        tone_url: formData.toneUrl,
        word_count: formData.wordCount,
        include_frontmatter: formData.includeFrontmatter,
        media_mode: formData.mediaMode,
        media_file: formData.mediaFile ? formData.mediaFile.name : null,
      })
      .select('id')
      .single();
    
    if (requestError) {
      console.error('Error storing content request:', requestError);
      throw new Error(`Failed to store content request: ${requestError.message}`);
    }
    
    if (!requestData) {
      console.error('No data returned from content request insert');
      throw new Error('Failed to store content request: No ID returned');
    }
    
    const requestId = requestData.id;
    
    // Process frontmatter for storage
    const frontmatterJson = generatedContent.frontmatter ? 
      JSON.stringify(generatedContent.frontmatter) : 
      JSON.stringify({});
    
    // Process images for storage
    const imagesJson = generatedContent.images && Array.isArray(generatedContent.images) ? 
      JSON.stringify(generatedContent.images) :
      JSON.stringify([]);
    
    // Then, insert the generated content linked to the request
    const { data: newGeneratedContentData, error: contentError } = await supabase
      .from('generated_content')
      .insert({
        request_id: requestId,
        title: generatedContent.title,
        content: generatedContent.content,
        frontmatter: frontmatterJson,
        images: imagesJson,
        word_count: generatedContent.wordCount,
        reading_time: generatedContent.readingTime,
      })
      .select('id')
      .single();
    
    if (contentError) {
      console.error('Error storing generated content:', contentError);
      throw new Error(`Failed to store generated content: ${contentError.message}`);
    }

    if (!newGeneratedContentData) {
      console.error('No data returned from generated_content insert');
      throw new Error('Failed to store generated content: No ID returned');
    }
    
    console.log('Content request and generated content stored successfully');
    return { requestId, generatedContentId: newGeneratedContentData.id };
  } catch (error) {
    console.error('Error in storeContentRequest:', error);
    // Continue despite storage error - don't disrupt user experience
    // We could implement a retry mechanism here
    throw error;
  }
};

// Define a type for the items returned by the Supabase query in getContentHistory
interface RawContentHistoryItem {
  id: string;
  title: string;
  content: string;
  frontmatter: string | Record<string, any>; // It's a JSON string from DB, or parsed object
  images: string | any[]; // JSON string or parsed array
  word_count: number;
  reading_time: number;
  generated_at: string;
  content_requests: null | { // content_requests can be null if join finds no match, though unlikely with FK
    id: string;
    prompt: string;
    language: string;
  };
}

// Get content history from database
export const getContentHistory = async (): Promise<(GeneratedContent & { generatedAt: string, requestId: string })[]> => {
  try {
    const { data, error } = await supabase
      .from('generated_content')
      .select(`
        id, title, content, frontmatter, images, word_count, reading_time, generated_at,
        content_requests (id, prompt, language) 
      `)
      .order('generated_at', { ascending: false });
    
    if (error) {
      console.error('Error retrieving content history:', error);
      throw new Error(`Failed to retrieve content history: ${error.message}`);
    }
    
    if (!data || data.length === 0) {
      return [];
    }
    
    // Process the results to match our GeneratedContent type
    return (data as unknown as RawContentHistoryItem[]).map(item => { // Cast data to unknown then to RawContentHistoryItem[]
      // Parse the frontmatter from JSON
      const frontmatterObj = typeof item.frontmatter === 'string' 
        ? JSON.parse(item.frontmatter) 
        : (item.frontmatter || {});

      // Default empty array for images since it might not exist in the database
      let imagesArr: any[] = [];
      
      // Check if the item has an images property before trying to parse it
      if ('images' in item) {
        const itemImages = (item as any).images;
        if (itemImages) {
          imagesArr = typeof itemImages === 'string' ? JSON.parse(itemImages) : itemImages;
        }
      }
        
      return {
        id: item.id,
        title: item.title,
        content: item.content,
        frontmatter: frontmatterObj,
        images: imagesArr,
        wordCount: item.word_count,
        readingTime: item.reading_time,
        generatedAt: item.generated_at || new Date().toISOString(),
        requestId: item.content_requests?.id || '',
        prompt: item.content_requests?.prompt || '',
        language: item.content_requests?.language || 'en'
      };
    }) as (GeneratedContent & { generatedAt: string, requestId: string })[];
  } catch (error) {
    console.error('Error retrieving content history:', error);
    return [] as (GeneratedContent & { generatedAt: string, requestId: string })[];
  }
};
