
import { FormData, GeneratedContent, mockGeneratedContent } from "@/components/content/form/types";

// This would be replaced with actual API calls in a real implementation
export const generateContent = async (formData: FormData): Promise<GeneratedContent> => {
  console.log('Generating content with parameters:', formData);
  
  // In a real implementation, this would make an API call to a backend service
  // that would use LLMs, web search, etc. to generate content
  
  // For now, we'll simulate a delay and return mock data
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  return {
    ...mockGeneratedContent,
    wordCount: formData.wordCount,
    // Customize mock content based on form data
    title: formData.prompt.charAt(0).toUpperCase() + formData.prompt.slice(1),
    frontmatter: {
      ...mockGeneratedContent.frontmatter,
      title: formData.prompt.charAt(0).toUpperCase() + formData.prompt.slice(1),
      tags: ["Blog Article", ...mockGeneratedContent.frontmatter.tags],
    }
  };
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
