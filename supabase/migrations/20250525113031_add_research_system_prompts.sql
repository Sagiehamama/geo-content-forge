-- Add research agent system prompts to content_templates table

INSERT INTO content_templates (
  name,
  description,
  system_prompt,
  user_prompt,
  is_default,
  updated_at
) VALUES
(
  'research_subreddit_discovery_system',
  'System prompt for the Research Agent subreddit discovery step',
  'You are a Reddit research expert. Your job is to identify the most relevant subreddits for finding original insights on a given topic. Always respond with valid JSON only.',
  '',
  false,
  NOW()
),
(
  'research_classification_system', 
  'System prompt for the Research Agent post classification step',
  'You are an expert at analyzing Reddit posts to identify valuable insights for content creation. Always respond with valid JSON only.',
  '',
  false,
  NOW()
),
(
  'research_enrichment_system',
  'System prompt for the Research Agent prompt enrichment step', 
  'You are an expert content strategist who enriches content prompts with authentic user insights. Always respond with valid JSON only.',
  '',
  false,
  NOW()
);
