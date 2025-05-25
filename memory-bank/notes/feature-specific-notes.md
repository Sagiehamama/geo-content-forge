# Feature-Specific Notes

## Media Agent Architecture - CRITICAL
- **Media Agent prompt is stored in database `content_templates.media_agent_prompt` field**
- **Prompt is editable via Settings page UI - NOT in edge function code**
- **Edge function fetches prompt from database at runtime**
- **Only minimal fallback prompt exists in code for emergency cases**
- **All prompt improvements must be made via Settings page to update database**
- **Current issue was solved by updating the database prompt via Settings, not code**

## Media Agent Query Simplification - RESOLVED
- **Issue**: Media agent was returning irrelevant images due to overly complex search queries (5-7 words)
- **Root Cause**: Complex location-based queries like "Geneva to Chamonix scenic route" don't work well with Unsplash API
- **Solution**: Added query mapping logic in edge function to convert complex queries to simple 1-3 word terms
- **Examples**: "Geneva to Chamonix" → "mountains", "local restaurant reviews" → "restaurant"
- **Best Practice**: Unsplash works best with simple, descriptive terms (1-3 words max)

## Manual Media Upload Implementation - IN PROGRESS
- **Issue Found**: Manual upload toggle was ignored - system still provided automatic suggestions
- **Issue Found**: Only supported single file upload, needed multiple file support
- **Data Structure Change**: Updated from `mediaFile: File | null` to `mediaFiles: File[]`
- **UI Enhancement**: MediaField component now supports multiple file selection with individual removal
- **Manual Mode Logic**: ResultsPage should detect manual mode and convert uploaded files to MediaImageSpot objects
- **File Handling**: Use URL.createObjectURL for uploaded files instead of calling media-agent service
- **Status**: 70% complete - data structure and UI updated, ResultsPage integration in progress

## UI Cleanup Completed
- **Input Page**: Removed subtitle, company description text, YAML frontmatter toggle (always on)
- **Default State**: Reddit research agent now defaults to ON
- **Files Modified**: FormSection.tsx, CompanyField.tsx, ContentOptionsField.tsx, types.ts

## Other Notes
- Media Agent prompt is stored in DB and editable via settings.
- Media Agent only does image search and user selection for now (no image generation).
- UI uses a nice placeholder if no image is chosen.
