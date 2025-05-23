# Research Agent

## Overview
The Research Agent is a Reddit-focused research system that identifies original, insightful trends or user-generated perspectives relevant to a company's SEO/GEO content prompt. It enriches content prompts with real Reddit insights to create more engaging, authentic content.

## Core Workflow

### 1. Input Processing
- Takes the original SEO content prompt
- Requires a short company description for context
- Optional toggle to enable/disable research

### 2. Subreddit Discovery
- Uses LLM to identify relevant subreddits based on:
  - Topic relevance to the prompt
  - Company/industry alignment
  - Recent activity levels
  - Comment engagement metrics
- Returns top 10 subreddits with activity data

### 3. Initial Post Scraping
- Scrapes 15-30 recent posts from selected subreddits
- Collects: title, body, upvotes, comment count, age
- Uses Puppeteer to bypass API limits and access restricted content

### 4. Insight Classification Engine

#### Step 4.1: Candidate Shortlisting
- LLM analyzes all scraped post titles/bodies in batch
- Selects up to 3 posts with:
  - Original insights or novel perspectives
  - Relevance to prompt and company
  - Non-generic, unexplored angles
- Returns summary, selection reason, and post ID for each

#### Step 4.2: Full Thread Scraping
- Rescrapes complete threads for selected posts
- Includes all top-level and second-level comments
- Captures full discussion context

#### Step 4.3: Final Selection & Prompt Generation
- LLM analyzes each full thread individually
- Generates detailed blog prompts that include:
  - User terminology and language patterns
  - Specific examples and anecdotes from comments
  - Emotional context and sentiment
  - Implied pain points and solutions
- Selects the best single insight using relevance, depth, and novelty criteria

### 5. Output Generation
- One enriched prompt passed to Content Generator Agent
- Research insight displayed on Results Page with transparency
- Fallback to original prompt if no insights found

## Technical Implementation

### Edge Function Structure
```
supabase/functions/research-agent/
├── index.ts                 # Main handler
├── subreddit-discovery.ts   # LLM-based subreddit identification
├── reddit-scraper.ts       # Puppeteer scraping logic
├── insight-classifier.ts   # Multi-step insight evaluation
├── prompt-enricher.ts      # Final prompt generation
└── types.ts                # TypeScript interfaces
```

### Database Schema Extensions
```sql
-- Research insights table
CREATE TABLE research_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id UUID REFERENCES content_items(id),
  reddit_post_url TEXT,
  reddit_post_title TEXT,
  insight_summary TEXT,
  enriched_prompt TEXT,
  selected_subreddits JSONB,
  scraping_metadata JSONB,
  created_at TIMESTAMP DEFAULT now()
);

-- Subreddit cache for performance
CREATE TABLE subreddit_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_hash TEXT UNIQUE, -- Hash of topic + company for lookup
  subreddits JSONB,
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT now()
);
```

### Rate Limiting & Performance
- Request pacing to avoid Reddit rate limits
- Subreddit cache to reduce repeated API calls
- Batch processing for efficiency
- Background processing with progress indicators

## UI Integration

### Input Page Changes
- Add company description field
- Add Research Agent toggle switch
- Show loading state when research is active

### Results Page Enhancements
- **Success Case:** Display research insight used with link to original post
- **Failure Case:** Show "no insights found" message with reassurance
- Research insight clearly labeled and highlighted
- Option to regenerate content without research

### History Page Updates
- Visual indicator for content that used research insights
- Filter by research-enhanced content
- Display research metadata in content previews

## Error Handling & Fallbacks

### Failure Scenarios
1. **No relevant subreddits found:** Expand search criteria, retry once
2. **Scraping fails:** Use cached data or skip research
3. **No quality insights:** Fall back to original prompt
4. **Rate limiting:** Queue request or skip research with user notification

### User Communication
- Clear progress indicators during research
- Transparent messaging about research outcomes
- Graceful fallbacks maintain user workflow

## Prompt Templates

### Subreddit Discovery Prompt
```
Given the following topic and company, which active subreddits are most relevant for finding original perspectives?

Topic: {{prompt}}
Company: {{company_description}}

Return top 10 subreddits with:
- Relevance score (1-10)
- Recent activity level
- Primary discussion themes
- Expected insight quality

Format as JSON array.
```

### Insight Classification Prompt
```
Analyze these Reddit posts for the topic "{{prompt}}" and company "{{company_description}}".

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
```

### Final Prompt Enrichment
```
Analyze this Reddit thread for powerful insights to form a blog post core.

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
```

## Success Metrics
- Research completion rate
- Insight discovery rate (% of requests finding usable insights)
- Content engagement improvements from research-enhanced content
- User satisfaction with research feature
- Performance metrics (scraping speed, error rates)

## Future Enhancements
- Multi-platform research (Twitter, Discord, etc.)
- Trend analysis across time periods
- User feedback loop for insight quality
- Advanced caching and optimization
- Research history and pattern recognition 