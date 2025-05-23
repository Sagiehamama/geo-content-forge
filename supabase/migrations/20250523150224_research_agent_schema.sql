-- Research Agent Database Schema
-- Creates tables and indexes needed for Reddit research functionality

-- 1. Research insights table - stores Reddit insights and enriched prompts
CREATE TABLE research_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id UUID REFERENCES generated_content(id) ON DELETE CASCADE,
  reddit_post_url TEXT NOT NULL,
  reddit_post_title TEXT NOT NULL,
  reddit_post_id TEXT NOT NULL,
  insight_summary TEXT NOT NULL,
  enriched_prompt TEXT NOT NULL,
  original_prompt TEXT NOT NULL,
  selected_subreddits JSONB NOT NULL,
  scraping_metadata JSONB DEFAULT '{}',
  classification_score DECIMAL(3,2), -- 0.00 to 1.00
  processing_time_seconds INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Indexes for research_insights performance
CREATE INDEX idx_research_insights_content_id ON research_insights(content_id);
CREATE INDEX idx_research_insights_created_at ON research_insights(created_at);

-- 2. Subreddit cache table - caches subreddit discovery for performance
CREATE TABLE subreddit_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_hash TEXT UNIQUE NOT NULL, -- SHA256 hash of topic + company
  topic_text TEXT NOT NULL,
  company_context TEXT NOT NULL,
  subreddits JSONB NOT NULL,
  discovery_metadata JSONB DEFAULT '{}',
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  last_used_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Indexes for subreddit_cache performance
CREATE INDEX idx_subreddit_cache_topic_hash ON subreddit_cache(topic_hash);
CREATE INDEX idx_subreddit_cache_expires_at ON subreddit_cache(expires_at);

-- 3. Add research-related fields to existing generated_content table
ALTER TABLE generated_content ADD COLUMN IF NOT EXISTS research_insight_id UUID REFERENCES research_insights(id);
ALTER TABLE generated_content ADD COLUMN IF NOT EXISTS used_research_agent BOOLEAN DEFAULT FALSE;
ALTER TABLE generated_content ADD COLUMN IF NOT EXISTS research_processing_time INTEGER; -- seconds

-- Index for filtering research-enhanced content
CREATE INDEX IF NOT EXISTS idx_generated_content_used_research ON generated_content(used_research_agent);

-- 4. Add research agent prompt templates to content_templates table
INSERT INTO content_templates (name, system_prompt, user_prompt, description, is_default) VALUES
('research_subreddit_discovery', 
 'You are a Reddit research expert. Your job is to identify the most relevant subreddits for finding original insights on a given topic.',
 'Given the following topic and company, which active subreddits are most relevant for finding original perspectives?

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
]',
 'Prompt for discovering relevant subreddits for research',
 false),

('research_insight_classification',
 'You are an expert at analyzing Reddit posts to identify valuable insights for content creation.',
 'Analyze these Reddit posts for the topic "{{prompt}}" and company "{{company_description}}".

Select up to 3 posts that contain:
- Original insights, pain points, or novel perspectives
- Relevance to the given prompt and company context
- Non-generic content not widely covered elsewhere

For each selection, provide:
- Short insight summary
- Selection reasoning
- Post ID

Posts to analyze:
{{posts_batch}}

Return as JSON array:
[
  {
    "post_id": "abc123",
    "insight_summary": "Brief summary of the insight",
    "selection_reason": "Why this post was selected",
    "relevance_score": 8.5
  }
]',
 'Prompt for classifying and selecting insights from Reddit posts',
 false),

('research_prompt_enrichment',
 'You are an expert content strategist who enriches content prompts with authentic user insights from Reddit discussions.',
 'Analyze this Reddit thread for powerful insights to form a blog post core.

Original prompt: {{original_prompt}}
Company context: {{company_description}}

Reddit thread:
{{full_thread}}

If this contains sufficient insight, generate a detailed blog prompt including:
- Clear user terminology and language patterns
- Specific examples/anecdotes from the discussion
- Emotional context and sentiment
- Implied pain points or solutions
- Authentic voice and perspective

Be specific and include rich detail from the discussion.

Return as JSON:
{
  "enriched_prompt": "The detailed enriched prompt text",
  "key_insights": ["insight1", "insight2"],
  "user_language": ["term1", "term2"],
  "sentiment": "frustrated/excited/concerned/etc",
  "confidence_score": 8.5
}',
 'Prompt for enriching content prompts with Reddit insights',
 false);

-- 5. Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_research_insights_updated_at 
    BEFORE UPDATE ON research_insights 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
