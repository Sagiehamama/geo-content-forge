
import { FormData, GeneratedContent } from "@/components/content/form/types";
import { supabase } from "@/integrations/supabase/client";

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
    
    // Make sure all required fields are present
    if (!template.name || !template.system_prompt || !template.user_prompt) {
      throw new Error('Template name, system prompt, and user prompt are required');
    }
    
    const templateToSave = {
      name: template.name,
      description: template.description || null,
      system_prompt: template.system_prompt,
      user_prompt: template.user_prompt,
      is_default: template.is_default ?? false,
      updated_at: new Date().toISOString()
    };
    
    // Add the id if it exists (for updates)
    if (template.id) {
      templateToSave['id'] = template.id;
    }
    
    const { data, error } = await supabase
      .from('content_templates')
      .upsert(templateToSave)
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
    
    // Validate form data
    if (!formData || !formData.prompt) {
      throw new Error("Missing required form data. Please provide at least a prompt.");
    }
    
    // Save the content request to the database
    const { data: requestData, error: requestError } = await supabase
      .from('content_requests')
      .insert({
        prompt: formData.prompt,
        country: formData.country,
        language: formData.language || 'en',
        tone: formData.tone,
        tone_type: formData.toneType,
        tone_url: formData.toneUrl,
        include_images: formData.includeImages,
        include_frontmatter: formData.includeFrontmatter,
        use_ai_media: formData.useAiMedia,
        word_count: formData.wordCount || 1000,
        audience: formData.audience || 'General readers'
      })
      .select()
      .single();
      
    if (requestError) throw requestError;

    // Call the Edge Function to generate content
    const llmResponse = await supabase.functions.invoke('generate-content', {
      body: { formData, templateId }
    });
    
    const { data, error: functionError } = llmResponse;
    if (functionError) {
      console.error('Error calling content generation function:', functionError);
      throw functionError;
    }
    
    if (!data) {
      throw new Error('No data returned from content generation function');
    }
    
    // Store the generated content in the database
    const { error: contentError } = await supabase
      .from('generated_content')
      .insert({
        request_id: requestData.id,
        title: data.title,
        content: data.content,
        frontmatter: JSON.stringify(data.frontmatter),  // Convert to string to fix Json type issue
        word_count: data.wordCount,
        reading_time: data.readingTime
      });
      
    if (contentError) throw contentError;
    
    return data;
  } catch (error) {
    console.error("Error generating content:", error);
    throw error;
  }
};

// Get content history from database
export const getContentHistory = async (): Promise<GeneratedContent & { generatedAt: string }[]> => {
  try {
    const { data, error } = await supabase
      .from('generated_content')
      .select(`
        id,
        title,
        content,
        frontmatter,
        word_count,
        reading_time,
        generated_at,
        content_requests (
          prompt,
          language,
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
      images: [], // Empty images array to satisfy the type
      wordCount: item.word_count,
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
