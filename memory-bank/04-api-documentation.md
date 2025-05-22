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
- **Media Agent prompt is also stored in the DB and editable via the settings page.**
