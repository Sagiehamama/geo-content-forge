
import { FormData, GeneratedContent } from "@/components/content/form/types";
import { supabase } from "@/integrations/supabase/client";
import { v4 as uuidv4 } from "uuid";

// Content template type
export interface ContentTemplate {
  id: string;
  name: string;
  description: string | null;
  system_prompt: string;
  user_prompt: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

// Configuration for OpenAI API
interface OpenAIConfig {
  model: string;
}

// Default configuration
const openAIConfig: OpenAIConfig = {
  model: "gpt-4o",
};

// Set OpenAI API key (to be called from settings)
export const setOpenAIApiKey = async (apiKey: string): Promise<void> => {
  try {
    // Store in Supabase
    const { error } = await supabase
      .from('app_config')
      .upsert(
        { 
          key: 'openai_api_key', 
          value: apiKey,
          updated_at: new Date().toISOString()
        },
        { onConflict: 'key' }
      );
      
    if (error) throw error;
    
    console.log('API key saved successfully');
  } catch (error) {
    console.error('Error saving API key:', error);
    throw error;
  }
};

// Get the current OpenAI API key
export const getOpenAIApiKey = async (): Promise<string | null> => {
  try {
    const { data, error } = await supabase
      .from('app_config')
      .select('value')
      .eq('key', 'openai_api_key')
      .maybeSingle();
      
    if (error) throw error;
    
    return data?.value || null;
  } catch (error) {
    console.error('Error retrieving API key:', error);
    return null;
  }
};

// Template management functions
export const getContentTemplates = async (): Promise<ContentTemplate[]> => {
  try {
    const { data, error } = await supabase
      .from('content_templates')
      .select('*')
      .order('name');
      
    if (error) throw error;
    
    return data || [];
  } catch (error) {
    console.error('Error retrieving content templates:', error);
    return [];
  }
};

export const getContentTemplate = async (id: string): Promise<ContentTemplate | null> => {
  try {
    const { data, error } = await supabase
      .from('content_templates')
      .select('*')
      .eq('id', id)
      .maybeSingle();
      
    if (error) throw error;
    
    return data;
  } catch (error) {
    console.error('Error retrieving content template:', error);
    return null;
  }
};

export const getDefaultTemplate = async (): Promise<ContentTemplate | null> => {
  try {
    const { data, error } = await supabase
      .from('content_templates')
      .select('*')
      .eq('is_default', true)
      .maybeSingle();
      
    if (error) throw error;
    
    return data;
  } catch (error) {
    console.error('Error retrieving default template:', error);
    return null;
  }
};

export const saveContentTemplate = async (template: Partial<ContentTemplate>): Promise<ContentTemplate | null> => {
  try {
    // If setting this template as default, unset default flag on all other templates
    if (template.is_default) {
      await supabase
        .from('content_templates')
        .update({ is_default: false })
        .neq('id', template.id || ''); // Use empty string for new templates
    }
    
    const { data, error } = await supabase
      .from('content_templates')
      .upsert({
        ...template,
        updated_at: new Date().toISOString()
      })
      .select()
      .single();
      
    if (error) throw error;
    
    return data;
  } catch (error) {
    console.error('Error saving content template:', error);
    return null;
  }
};

export const deleteContentTemplate = async (id: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('content_templates')
      .delete()
      .eq('id', id);
      
    if (error) throw error;
    
    return true;
  } catch (error) {
    console.error('Error deleting content template:', error);
    return false;
  }
};

// Main function to generate content
export const generateContent = async (formData: FormData, templateId?: string): Promise<GeneratedContent> => {
  console.log('Generating content with parameters:', formData);
  
  try {
    // Check if we have an API key
    const apiKey = await getOpenAIApiKey();
    if (!apiKey) {
      throw new Error("OpenAI API key is not set. Please configure it in settings.");
    }
    
    // Save the content request to the database
    const { data: requestData, error: requestError } = await supabase
      .from('content_requests')
      .insert({
        prompt: formData.prompt,
        audience: formData.audience,
        country: formData.country,
        language: formData.language || 'en',
        tone: formData.tone,
        tone_type: formData.toneType,
        tone_url: formData.toneUrl,
        include_images: formData.includeImages,
        include_frontmatter: formData.includeFrontmatter,
        use_ai_media: formData.useAiMedia,
        word_count: formData.wordCount
      })
      .select()
      .single();
      
    if (requestError) throw requestError;

    // Call the Supabase Edge Function to generate content
    const { data, error: functionError } = await supabase.functions.invoke('generate-content', {
      body: { formData, templateId }
    });
    
    if (functionError) {
      console.error('Error calling generate-content function:', functionError);
      throw functionError;
    }
    
    if (!data) {
      throw new Error('No data returned from content generation function');
    }
    
    const generatedContent: GeneratedContent = data;
    
    // Store the generated content in the database
    const { error: contentError } = await supabase
      .from('generated_content')
      .insert({
        request_id: requestData.id,
        title: generatedContent.title,
        content: generatedContent.content,
        frontmatter: JSON.stringify(generatedContent.frontmatter),  // Convert to string to fix Json type issue
        word_count: generatedContent.wordCount,
        seo_score: generatedContent.seoScore,
        readability_score: generatedContent.readabilityScore,
        fact_check_score: generatedContent.factCheckScore,
        reading_time: generatedContent.readingTime
      });
      
    if (contentError) throw contentError;
    
    return generatedContent;
  } catch (error) {
    console.error("Error generating content:", error);
    throw error;
  }
};

// Save generated content to database
export const saveGeneratedContent = async (content: GeneratedContent): Promise<void> => {
  try {
    // This method is now managed by the generateContent function
    // but keeping the interface for backward compatibility
    console.log('Content saved to database via generateContent function');
  } catch (error) {
    console.error('Error saving content:', error);
  }
};

// Get content history from database
export const getContentHistory = async (): Promise<(GeneratedContent & { generatedAt: string })[]> => {
  try {
    const { data, error } = await supabase
      .from('generated_content')
      .select(`
        id,
        title,
        content,
        frontmatter,
        word_count,
        seo_score,
        readability_score,
        fact_check_score,
        reading_time,
        generated_at,
        content_requests (
          prompt,
          language,
          audience,
          country
        )
      `)
      .order('generated_at', { ascending: false })
      .limit(10);
      
    if (error) throw error;
    
    // Transform the data into the expected format
    return (data || []).map(item => ({
      id: item.id,
      title: item.title,
      content: item.content,
      frontmatter: typeof item.frontmatter === 'string' 
        ? JSON.parse(item.frontmatter) 
        : item.frontmatter,
      images: [], // Add empty images array to satisfy the type
      wordCount: item.word_count,
      seoScore: item.seo_score,
      readabilityScore: item.readability_score,
      factCheckScore: item.fact_check_score,
      readingTime: item.reading_time,
      generatedAt: item.generated_at,
      prompt: item.content_requests?.prompt || '',
      language: item.content_requests?.language || 'en'
    }));
  } catch (error) {
    console.error('Error retrieving content history:', error);
    return [];
  }
};

// Function to convert markdown to HTML for rendering
export const markdownToHtml = (markdown: string): string => {
  // Keep the existing implementation
  // This is a very basic implementation
  // In a real app, you'd use a library like marked or remark
  let html = markdown
    .replace(/^# (.*$)/gm, '<h1>$1</h1>')
    .replace(/^## (.*$)/gm, '<h2>$1</h2>')
    .replace(/^### (.*$)/gm, '<h3>$1</h3>')
    .replace(/\*\*(.*)\*\*/gm, '<strong>$1</strong>')
    .replace(/\*(.*)\*/gm, '<em>$1</em>')
    .replace(/\n/gm, '<br>');
    
  // Convert lists
  html = html.replace(/^\- (.*$)/gm, '<li>$1</li>');
  html = html.replace(/<li>(.*)<\/li>\n<li>/gm, '<li>$1</li><li>');
  html = html.replace(/(<li>.*<\/li>)/gm, '<ul>$1</ul>');
  
  return html;
};
