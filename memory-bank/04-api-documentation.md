# API Documentation

## Input Format (JSON)
```json
{
  "topics": [
    { "title": "...", "search_queries": ["..."] }
  ],
  "settings": {
    "tone_of_voice": "...",
    "target_audience": "...",
    "word_count": 1000,
    "include_images": true
  }
}
```

## Output Format (Markdown + YAML Frontmatter)
- Metadata: title, slug, description, author, tags, categories, status, canonical_url, last_updated, SEO fields, structured_data
- Content: Markdown with images, citations, internal links
- QA: Annotated Markdown, confidence score, inline comments
- Repurposed: Platform-specific short-form content (LinkedIn, X, Reddit)

## Future API/Integration Plans
- Scraping agent for social/forum insights
- Auto-publishing to social APIs
- Multi-language/localization endpoints
- Collaboration and metrics endpoints

## Settings API

- `GET /api/settings/prompt` — Returns the current system prompt template from the `content_templates` table.
- `POST /api/settings/prompt` — Updates the system prompt template in the `content_templates` table.
  - Body: `{ value: string }`
  - Returns updated prompt.
- **CRITICAL: Media Agent prompt is stored in database `content_templates.media_agent_prompt` field**
- **Media Agent prompt is editable via Settings page and fetched by edge function at runtime**
- **Do NOT modify the hardcoded fallback prompt in the edge function code**
- **All Media Agent prompt improvements must be made via Settings UI to update the database**

## Supabase Edge Functions

### Research Agent ✅ IMPLEMENTED
**Endpoint**: `POST /functions/v1/research-agent`
**Purpose**: Reddit research and insight extraction for content enrichment

**Request**:
```json
{
  "prompt": "string (required)",
  "options": {
    "maxSubreddits": 5,
    "maxPostsPerSubreddit": 20,
    "useCache": true
  }
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "originalPrompt": "How to improve local business SEO",
    "enrichedPrompt": "Enhanced prompt with Reddit insights...",
    "subreddits": ["SEO", "smallbusiness", "entrepreneur"],
    "insights": [
      {
        "content": "Users frequently mention Google My Business optimization",
        "source": "r/SEO discussion thread",
        "relevanceScore": 9,
        "sentiment": "positive",
        "type": "solution"
      }
    ],
    "metadata": {
      "processingTime": 15430,
      "postsAnalyzed": 67,
      "cacheHit": false,
      "timestamp": "2024-12-XX"
    }
  }
}
```

**Error Response**:
```json
{
  "success": false,
  "error": "Error message"
}
```

### Content Generation
**Endpoint**: `POST /functions/v1/generate-content`
**Purpose**: Main content generation using multiple AI agents

### SEO Agent
**Endpoint**: `POST /functions/v1/seo-agent`
**Purpose**: SEO optimization and metadata generation

### Media Agent
**Endpoint**: `POST /functions/v1/media-agent`
**Purpose**: Image search and visual content suggestions

## Database API

### Research Insights
**Table**: `research_insights`
**Purpose**: Store research results and prompt enrichments

**Query Examples**:
```sql
-- Get research for specific content
SELECT * FROM research_insights WHERE content_item_id = $1;

-- Get recent research activity
SELECT * FROM research_insights ORDER BY created_at DESC LIMIT 10;
```

### Subreddit Cache
**Table**: `subreddit_cache`
**Purpose**: Cache subreddit discoveries for performance

**Query Examples**:
```sql
-- Check cache for topic
SELECT subreddits FROM subreddit_cache 
WHERE topic_hash = $1 AND created_at > NOW() - INTERVAL '7 days';
```

## Authentication
All endpoints require Supabase authentication headers:
```
Authorization: Bearer <supabase_jwt_token>
apikey: <supabase_anon_key>
```
