import { FormData, GeneratedContent, mockGeneratedContent } from "@/components/content/form/types";

// Storage key for generated content
const STORAGE_KEY = "generatedContent";

// Configuration for OpenAI API
interface OpenAIConfig {
  apiKey: string | null;
  model: string;
}

// Default configuration (apiKey will be set by the user)
const openAIConfig: OpenAIConfig = {
  apiKey: localStorage.getItem("openai_api_key"),
  model: "gpt-4o",
};

// Set OpenAI API key (to be called from settings)
export const setOpenAIApiKey = (apiKey: string) => {
  localStorage.setItem("openai_api_key", apiKey);
  openAIConfig.apiKey = apiKey;
};

// Get the current OpenAI API key
export const getOpenAIApiKey = (): string | null => {
  return openAIConfig.apiKey;
};

// Main function to generate content
export const generateContent = async (formData: FormData): Promise<GeneratedContent> => {
  console.log('Generating content with parameters:', formData);
  
  // Check if we have an API key
  if (!openAIConfig.apiKey) {
    throw new Error("OpenAI API key is not set. Please configure it in settings.");
  }
  
  try {
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
    
    // Store the generated content in localStorage
    saveGeneratedContent(generatedContent);
    
    return generatedContent;
  } catch (error) {
    console.error("Error generating content:", error);
    throw error;
  }
};

// Function to connect to OpenAI API (placeholder for now)
const generateWithOpenAI = async (prompt: string, options: any): Promise<string> => {
  // This would be replaced with an actual OpenAI API call
  // For example:
  /*
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${openAIConfig.apiKey}`
    },
    body: JSON.stringify({
      model: openAIConfig.model,
      messages: [
        { role: 'system', content: 'You are a content generator that creates high-quality blog posts.' },
        { role: 'user', content: prompt }
      ],
      max_tokens: options.maxTokens || 1500,
      temperature: options.temperature || 0.7
    })
  });
  
  const data = await response.json();
  return data.choices[0].message.content;
  */
  
  // For now, return mock content
  return mockGeneratedContent.content;
};

// Save generated content to localStorage
export const saveGeneratedContent = (content: GeneratedContent): void => {
  // Get existing content history or initialize new array
  const contentHistory = getContentHistory();
  
  // Add new content with timestamp
  contentHistory.unshift({
    ...content,
    generatedAt: new Date().toISOString()
  });
  
  // Keep only the latest 10 items
  const updatedHistory = contentHistory.slice(0, 10);
  
  // Save back to localStorage
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedHistory));
};

// Get content history from localStorage
export const getContentHistory = (): (GeneratedContent & { generatedAt: string })[] => {
  const storedContent = localStorage.getItem(STORAGE_KEY);
  return storedContent ? JSON.parse(storedContent) : [];
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
