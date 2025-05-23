import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { SubredditInfo, CacheEntry } from "./types.ts";

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const openAIApiKey = Deno.env.get('OPENAI_API_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export class SubredditDiscovery {
  
  // Generate a hash for topic + company for caching
  private async generateTopicHash(prompt: string, company: string): Promise<string> {
    const text = `${prompt}|${company}`.toLowerCase();
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  // Check cache for existing subreddit discovery
  private async checkCache(topicHash: string): Promise<SubredditInfo[] | null> {
    try {
      const { data, error } = await supabase
        .from('subreddit_cache')
        .select('*')
        .eq('topic_hash', topicHash)
        .gt('expires_at', new Date().toISOString())
        .single();

      if (error || !data) {
        return null;
      }

      // Update last_used_at
      await supabase
        .from('subreddit_cache')
        .update({ last_used_at: new Date().toISOString() })
        .eq('id', data.id);

      console.log(`Cache hit for topic hash: ${topicHash}`);
      return data.subreddits as SubredditInfo[];

    } catch (error) {
      console.error("Error checking cache:", error);
      return null;
    }
  }

  // Store subreddits in cache
  private async storeInCache(
    topicHash: string, 
    prompt: string, 
    company: string, 
    subreddits: SubredditInfo[]
  ): Promise<void> {
    try {
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24); // Cache for 24 hours

      const { error } = await supabase
        .from('subreddit_cache')
        .upsert({
          topic_hash: topicHash,
          topic_text: prompt,
          company_context: company,
          subreddits: subreddits,
          expires_at: expiresAt.toISOString(),
          discovery_metadata: {
            discovery_method: 'llm_analysis',
            total_subreddits_found: subreddits.length,
            created_at: new Date().toISOString()
          }
        });

      if (error) {
        console.error("Error storing in cache:", error);
      } else {
        console.log(`Stored ${subreddits.length} subreddits in cache`);
      }
    } catch (error) {
      console.error("Error storing in cache:", error);
    }
  }

  // Get prompt template from database
  private async getPromptTemplate(): Promise<string> {
    try {
      const { data, error } = await supabase
        .from('content_templates')
        .select('user_prompt')
        .eq('name', 'research_subreddit_discovery')
        .single();

      if (error || !data) {
        console.log("Using fallback prompt template");
        return this.getFallbackPrompt();
      }

      return data.user_prompt;
    } catch (error) {
      console.error("Error fetching prompt template:", error);
      return this.getFallbackPrompt();
    }
  }

  private getFallbackPrompt(): string {
    return `Given the following topic and company, which active subreddits are most relevant for finding original perspectives?

Topic: {{prompt}}
Company: {{company_description}}

Return top 10 subreddits with:
- Relevance score (1-10)
- Recent activity level
- Primary discussion themes
- Expected insight quality

Format as JSON array with this structure:
[
  {
    "name": "subreddit_name",
    "relevance_score": 8,
    "activity_level": "high",
    "themes": ["theme1", "theme2"],
    "expected_quality": "high"
  }
]`;
  }

  // Call OpenAI to discover subreddits
  private async discoverWithLLM(prompt: string, company: string): Promise<SubredditInfo[]> {
    try {
      console.log("Discovering subreddits with LLM...");

      const promptTemplate = await this.getPromptTemplate();
      const userPrompt = promptTemplate
        .replace('{{prompt}}', prompt)
        .replace('{{company_description}}', company);

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAIApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: 'You are a Reddit research expert. Your job is to identify the most relevant subreddits for finding original insights on a given topic. Always respond with valid JSON only.'
            },
            {
              role: 'user',
              content: userPrompt
            }
          ],
          temperature: 0.3,
          max_tokens: 1500,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices[0].message.content;

      // Parse the JSON response
      let subreddits: SubredditInfo[];
      try {
        // Handle markdown code blocks if present
        let cleanContent = content.trim();
        
        // Remove markdown code block delimiters if present
        if (cleanContent.startsWith('```json')) {
          cleanContent = cleanContent.replace(/^```json\s*/, '').replace(/\s*```$/, '');
        } else if (cleanContent.startsWith('```')) {
          cleanContent = cleanContent.replace(/^```\s*/, '').replace(/\s*```$/, '');
        }
        
        subreddits = JSON.parse(cleanContent);
      } catch (parseError) {
        console.error("Failed to parse LLM response:", content);
        throw new Error("Invalid JSON response from LLM");
      }

      // Validate and normalize the response
      const validSubreddits = subreddits
        .filter((sub: any) => sub.name && typeof sub.name === 'string')
        .map((sub: any) => ({
          name: sub.name.replace(/^r\//, ''), // Remove r/ prefix if present
          relevance_score: Math.min(10, Math.max(1, sub.relevance_score || 5)),
          activity_level: ['low', 'medium', 'high'].includes(sub.activity_level) ? 
            sub.activity_level : 'medium',
          recent_posts: sub.recent_posts || 0,
          avg_engagement: sub.avg_engagement || 0,
          themes: Array.isArray(sub.themes) ? sub.themes : [],
          expected_quality: ['low', 'medium', 'high'].includes(sub.expected_quality) ? 
            sub.expected_quality : 'medium',
        }))
        .slice(0, 10); // Ensure we don't exceed 10 subreddits

      console.log(`LLM discovered ${validSubreddits.length} subreddits`);
      return validSubreddits;

    } catch (error) {
      console.error("Error in LLM subreddit discovery:", error);
      throw error;
    }
  }

  // Main discovery method with caching
  async discoverSubreddits(prompt: string, company: string): Promise<SubredditInfo[]> {
    try {
      // Generate cache key
      const topicHash = await this.generateTopicHash(prompt, company);
      
      // Check cache first
      const cachedSubreddits = await this.checkCache(topicHash);
      if (cachedSubreddits) {
        return cachedSubreddits;
      }

      // Discover with LLM if not in cache
      const discoveredSubreddits = await this.discoverWithLLM(prompt, company);
      
      // Store in cache for future use
      await this.storeInCache(topicHash, prompt, company, discoveredSubreddits);
      
      return discoveredSubreddits;

    } catch (error) {
      console.error("Error in subreddit discovery:", error);
      
      // Return fallback subreddits if all else fails
      return this.getFallbackSubreddits(prompt);
    }
  }

  // Fallback subreddits based on common topics
  private getFallbackSubreddits(prompt: string): SubredditInfo[] {
    const commonKeywords = prompt.toLowerCase();
    const fallbackSubreddits: SubredditInfo[] = [];

    // General business/tech subreddits
    if (commonKeywords.includes('business') || commonKeywords.includes('startup')) {
      fallbackSubreddits.push({
        name: 'entrepreneur',
        relevance_score: 7,
        activity_level: 'high',
        recent_posts: 100,
        avg_engagement: 50,
        themes: ['business', 'startups'],
        expected_quality: 'medium'
      });
    }

    if (commonKeywords.includes('tech') || commonKeywords.includes('software')) {
      fallbackSubreddits.push({
        name: 'technology',
        relevance_score: 7,
        activity_level: 'high',
        recent_posts: 200,
        avg_engagement: 75,
        themes: ['technology', 'software'],
        expected_quality: 'medium'
      });
    }

    // Always include some general discussion subreddits
    fallbackSubreddits.push(
      {
        name: 'AskReddit',
        relevance_score: 5,
        activity_level: 'high',
        recent_posts: 500,
        avg_engagement: 100,
        themes: ['general', 'discussion'],
        expected_quality: 'low'
      },
      {
        name: 'todayilearned',
        relevance_score: 6,
        activity_level: 'high',
        recent_posts: 150,
        avg_engagement: 80,
        themes: ['learning', 'facts'],
        expected_quality: 'medium'
      }
    );

    console.log(`Using ${fallbackSubreddits.length} fallback subreddits`);
    return fallbackSubreddits.slice(0, 5); // Limit fallback subreddits
  }

  // Clean up expired cache entries (utility method)
  async cleanupExpiredCache(): Promise<void> {
    try {
      const { error } = await supabase
        .from('subreddit_cache')
        .delete()
        .lt('expires_at', new Date().toISOString());

      if (error) {
        console.error("Error cleaning up cache:", error);
      } else {
        console.log("Cleaned up expired cache entries");
      }
    } catch (error) {
      console.error("Error in cache cleanup:", error);
    }
  }
} 