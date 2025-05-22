import { FormData, GeneratedContent, mockGeneratedContent } from "@/components/content/form/types";
import { supabase } from "@/integrations/supabase/client";
import { v4 as uuidv4 } from "uuid";

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

// Main function to generate content
export const generateContent = async (formData: FormData): Promise<GeneratedContent> => {
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

    // In a real implementation, we would make an API call to OpenAI
    // For now, we'll simulate the delay and return enhanced mock data
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Create a custom content object based on the form data
    const generatedContent: GeneratedContent = {
      ...mockGeneratedContent,
      wordCount: formData.wordCount,
      title: formData.prompt.charAt(0).toUpperCase() + formData.prompt.slice(1),
      frontmatter: {
        ...mockGeneratedContent.frontmatter,
        title: formData.prompt.charAt(0).toUpperCase() + formData.prompt.slice(1),
        tags: ["Blog Article", ...mockGeneratedContent.frontmatter.tags],
      }
    };
    
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
