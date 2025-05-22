
import { FormData, GeneratedContent } from "@/components/content/form/types";
import { supabase } from "@/integrations/supabase/client";
import { Json } from "@/integrations/supabase/types";
import { toast } from "sonner";

// Generate content using Edge Function
export const generateContent = async (formData: FormData): Promise<GeneratedContent | null> => {
  try {
    console.log('Sending request to generate content with data:', formData);
    
    // Call the Supabase Edge Function
    const { data, error } = await supabase.functions.invoke("generate-content", {
      body: { formData },
    });
    
    if (error) {
      console.error('Error calling generate-content function:', error);
      throw new Error(`Failed to generate content: ${error.message}`);
    }
    
    if (!data) {
      console.error('No data returned from generate-content function');
      throw new Error('No content was generated. Please try again.');
    }

    // Check for specific missing OpenAI API key error
    if (data.missingKey) {
      toast.error('The OpenAI API key is not configured in the server environment. Please contact the administrator.');
      throw new Error('OpenAI API key not configured. Please contact the administrator.');
    }

    console.log('Content generated successfully:', data);

    // Store the content request and result in the database
    await storeContentRequest(formData, data);
    
    return data;
  } catch (error) {
    console.error('Error in generateContent:', error);
    throw error;
  }
};

// Store content request in database
const storeContentRequest = async (formData: FormData, generatedContent: GeneratedContent): Promise<void> => {
  try {
    // First, insert the content request
    const { data: requestData, error: requestError } = await supabase
      .from('content_requests')
      .insert({
        prompt: formData.prompt,
        language: formData.language,
        country: formData.country,
        tone: formData.tone,
        tone_type: formData.toneType,
        tone_url: formData.toneUrl,
        word_count: formData.wordCount,
        include_images: formData.includeImages,
        include_frontmatter: formData.includeFrontmatter,
        use_ai_media: formData.useAiMedia,
        audience: formData.audience,
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
    const { error: contentError } = await supabase
      .from('generated_content')
      .insert({
        request_id: requestId,
        title: generatedContent.title,
        content: generatedContent.content,
        frontmatter: frontmatterJson,
        images: imagesJson,
        word_count: generatedContent.wordCount,
        reading_time: generatedContent.readingTime,
      });
    
    if (contentError) {
      console.error('Error storing generated content:', contentError);
      throw new Error(`Failed to store generated content: ${contentError.message}`);
    }
    
    console.log('Content request and generated content stored successfully');
  } catch (error) {
    console.error('Error in storeContentRequest:', error);
    // Continue despite storage error - don't disrupt user experience
    // We could implement a retry mechanism here
  }
};

// Get content history from database
export const getContentHistory = async (): Promise<(GeneratedContent & { generatedAt: string })[]> => {
  try {
    const { data, error } = await supabase
      .from('generated_content')
      .select(`
        *,
        content_requests (*)
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
    return data.map(item => {
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
        generatedAt: item.generated_at || item.request_id, // Fallback if generated_at is missing
        prompt: item.content_requests?.prompt || '',
        language: item.content_requests?.language || 'en'
      };
    }) as (GeneratedContent & { generatedAt: string })[];
  } catch (error) {
    console.error('Error retrieving content history:', error);
    return [] as (GeneratedContent & { generatedAt: string })[];
  }
};
