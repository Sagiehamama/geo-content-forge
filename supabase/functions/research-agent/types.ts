// Research Agent TypeScript Interfaces

export interface RedditPost {
  id: string;
  title: string;
  body: string;
  url: string;
  upvotes: number;
  comments_count: number;
  created_at: string;
  subreddit: string;
  author: string;
  permalink: string;
}

export interface RedditComment {
  id: string;
  body: string;
  author: string;
  upvotes: number;
  created_at: string;
  replies?: RedditComment[];
}

export interface RedditThread extends RedditPost {
  comments: RedditComment[];
}

export interface SubredditInfo {
  name: string;
  relevance_score: number;
  activity_level: 'low' | 'medium' | 'high';
  recent_posts: number;
  avg_engagement: number;
  themes: string[];
  expected_quality: 'low' | 'medium' | 'high';
}

export interface ResearchRequest {
  prompt: string;
  company_description: string;
  enable_research: boolean;
}

// 🎯 XRAY: Message interface for conversation capture
export interface XrayMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  timestamp: number;
}

// 🎯 XRAY: Step interface for detailed tracking
export interface XrayStep {
  id: string;
  type: 'ai_conversation' | 'logical_operation';
  name: string;
  description: string;
  timestamp: number;
  duration?: number;
  status: 'running' | 'completed' | 'failed';
  // For AI conversations
  messages?: XrayMessage[];
  model?: string;
  tokens?: number;
  // For logical operations
  input?: any;
  output?: any;
  metadata?: any;
}

// 🎯 XRAY: Conversation interface for agent conversations
export interface XrayConversation {
  steps: XrayStep[];
  messages: XrayMessage[];
  timing: { start: number; end: number; duration: number };
  tokens?: number;
  model: string;
}

export interface ResearchResponse {
  success: boolean;
  enriched_prompt?: string;
  insight_summary?: string;
  reddit_post_url?: string;
  reddit_post_title?: string;
  processing_time_seconds: number;
  error?: string;
  fallback_reason?: string;
  // 🎯 XRAY: Include conversation data for transparency
  conversations?: {
    research_agent?: XrayConversation;
  };
}

export interface PostCandidate {
  post_id: string;
  insight_summary: string;
  selection_reason: string;
  relevance_score: number;
}

export interface EnrichedPromptResult {
  enriched_prompt: string;
  key_insights: string[];
  user_language: string[];
  sentiment: string;
  confidence_score: number;
}

export interface ScrapingMetadata {
  subreddits_checked: string[];
  posts_scraped: number;
  candidates_found: number;
  scraping_errors: string[];
  rate_limit_delays: number;
}

export interface CacheEntry {
  topic_hash: string;
  subreddits: SubredditInfo[];
  expires_at: string;
  created_at: string;
}

export interface ResearchInsight {
  id: string;
  content_id: string;
  reddit_post_url: string;
  reddit_post_title: string;
  reddit_post_id: string;
  insight_summary: string;
  enriched_prompt: string;
  original_prompt: string;
  selected_subreddits: SubredditInfo[];
  scraping_metadata: ScrapingMetadata;
  classification_score: number;
  processing_time_seconds: number;
  created_at: string;
}

// Error types for better error handling
export interface ResearchError {
  code: 'SCRAPING_FAILED' | 'NO_SUBREDDITS_FOUND' | 'NO_INSIGHTS_FOUND' | 'RATE_LIMITED' | 'UNKNOWN_ERROR';
  message: string;
  details?: any;
} 