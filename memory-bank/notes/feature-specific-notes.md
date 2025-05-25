# Feature-Specific Notes

## Media Agent Architecture - CRITICAL
- **Media Agent prompt is stored in database `content_templates.media_agent_prompt` field**
- **Prompt is editable via Settings page UI - NOT in edge function code**
- **Edge function fetches prompt from database at runtime**
- **Only minimal fallback prompt exists in code for emergency cases**
- **All prompt improvements must be made via Settings page to update database**
- **Current issue was solved by updating the database prompt via Settings, not code**

## Other Notes
- Media Agent prompt is stored in DB and editable via settings.
- Media Agent only does image search and user selection for now (no image generation).
- UI uses a nice placeholder if no image is chosen.
