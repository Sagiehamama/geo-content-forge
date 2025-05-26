import { FormData, GeneratedContent } from "@/components/content/form/types";
import { supabase } from "@/integrations/supabase/client";
import { Json } from "@/integrations/supabase/types";
import { toast } from "sonner";
import { conductResearch } from "./researchService";
import { XrayService, AgentConversation } from './xrayService';

// Generate content using Edge Function
export const generateContent = async (formData: FormData): Promise<GeneratedContent | null> => {
  try {
    console.log('Sending request to generate content with data:', formData);
    
    let enrichedPrompt = formData.prompt;
    let researchInsights: unknown[] = [];
    let contentId: string | null = null;
    let researchStatus: any = null;
    
    // Conduct research if enabled
    if (formData.enableResearch) {
      try {
        console.log('🔍 DEBUG: Research enabled - conducting Reddit research...');
        console.log('🔍 DEBUG: Research query:', formData.researchQuery || formData.prompt);
        console.log('🔍 DEBUG: Company:', formData.company);
        
        const researchQuery = formData.researchQuery || formData.prompt;
        const researchResult = await conductResearch(
          researchQuery,
          formData.prompt,
          formData.company
        );
        
        console.log('🔍 DEBUG: Research result received:', researchResult);
        
        enrichedPrompt = researchResult.enrichedPrompt;
        researchInsights = researchResult.insights;
        
        // Store research status for later use
        researchStatus = {
          enabled: true,
          insightsFound: researchResult.insights.length > 0,
          noInsightsReason: researchResult.noInsightsReason || null
        };
        
        // Get the current session that was created during research
        const currentSession = XrayService.getCurrentSession();
        contentId = currentSession?.contentId || null;
        
        console.log(`🔍 DEBUG: Research completed: ${researchInsights.length} insights found`);
        console.log('🔍 DEBUG: Current session after research:', currentSession);
        
        // Handle different research outcomes
        if (researchResult.noInsightsReason) {
          toast.info(`Research completed: ${researchResult.noInsightsReason}. Proceeding with original prompt.`);
        } else if (researchInsights.length > 0) {
          toast.success(`Research completed: ${researchInsights.length} insights discovered`);
        } else {
          toast.info('Research completed: No specific insights found, proceeding with original prompt.');
        }
      } catch (researchError) {
        console.error('🔍 DEBUG: Research failed:', researchError);
        toast.error('Research failed, generating content with original prompt');
        // Continue with original prompt if research fails
      }
    } else {
      console.log('🔍 DEBUG: Research is DISABLED');
    }
    
    // 🎯 XRAY: Start session if not already created by research
    if (!contentId) {
      contentId = `content-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      XrayService.startSession(contentId);
    }
    
    // Call the Supabase Edge Function with enriched prompt
    const { data, error } = await supabase.functions.invoke("generate-content", {
      body: { 
        formData: {
          ...formData,
          prompt: enrichedPrompt
        },
        // 🎯 XRAY: Include session ID to track conversations
        xraySessionId: contentId
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
    
    // 🎯 XRAY: Capture Content Generator conversations if returned
    if (data.conversations?.content_generator && contentId) {
      try {
        const contentConversation: AgentConversation = {
          agentName: 'content_generator',
          order: 2, // After research agent
          steps: data.conversations.content_generator.steps || [{
            id: 'content_generation',
            type: 'ai_conversation',
            name: 'Content Generation',
            description: 'AI generates article content using enriched insights',
            timestamp: Date.now(),
            duration: data.conversations.content_generator.timing?.duration || 0,
            status: 'completed',
            messages: data.conversations.content_generator.messages,
            model: data.conversations.content_generator.model,
            tokens: data.conversations.content_generator.tokens
          }],
          messages: data.conversations.content_generator.messages,
          timing: data.conversations.content_generator.timing,
          tokens: data.conversations.content_generator.tokens,
          model: data.conversations.content_generator.model
        };
        
        XrayService.logConversation(contentId, contentConversation);
        
        // Log data flow from research/user to content generator
        const fromAgent = formData.enableResearch ? 'research_agent' : 'user_input';
        XrayService.logDataFlow(contentId, {
          from: fromAgent,
          to: 'content_generator',
          data: { 
            enrichedPrompt: enrichedPrompt,
            originalPrompt: formData.prompt,
            company: formData.company
          },
          summary: formData.enableResearch 
            ? `Content Generator received enriched prompt with Reddit insights from Research Agent`
            : `Content Generator received original user prompt and company context`
        });
        
        console.log('✅ XRAY: Content Generator conversation captured');
      } catch (xrayError) {
        console.error('❌ XRAY: Failed to capture content generation conversation:', xrayError);
        // Don't fail content generation if XRAY capture fails
      }
    }

    // Store the content request and result in the database
    const dbIds = await storeContentRequest(formData, data);
    
    return {
      ...data,
      id: dbIds.generatedContentId,
      requestId: dbIds.requestId,
      images: data.images || [],
      researchInsights: researchInsights,
      // Include research status information
      ...(researchStatus && { researchStatus })
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
        media_file: formData.mediaFiles && formData.mediaFiles.length > 0 ? formData.mediaFiles[0].name : null,
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
  frontmatter: string | Record<string, unknown>; // It's a JSON string from DB, or parsed object
  images: string | unknown[]; // JSON string or parsed array
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
      let imagesArr: unknown[] = [];
      
      // Check if the item has an images property before trying to parse it
      if ('images' in item) {
        const itemImages = item.images;
        if (itemImages) {
                      imagesArr = typeof itemImages === 'string' ? JSON.parse(itemImages) : (itemImages as unknown[]);
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
