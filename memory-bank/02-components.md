# Components

## UI Components
- **Input Page:**
  - User prompt, location, language, tone, media, word count
  - Geolocation API for location
  - Tone presets saved to user profile
  - Dynamic template variables support
- **Results Page:**
  - Preview with enhanced Markdown rendering
  - Quality metrics (fact check, readability, SEO scores)
  - Content cleanup and formatting
  - QA Score + Annotations
  - Editable prompt for regen/tweaks
  - Repurpose Agent launcher
  - Save to History with proper state persistence
  - **Media selection UI:** 
    - For each image spot, user can select from 2-3 image options (or none)
    - Toggle between AI-suggested images and custom descriptions
    - Custom description input with real-time image search
    - Placeholder shown when no image is selected
    - Improved image placement logic
    - Better handling of alt text and captions
- **History Page:**
  - List, view, edit, repurpose saved articles/snippets
  - Filters by date, topic, status
  - Enhanced content preview
  - Better state restoration
- **Settings Tab/Page:**
  - View and edit the system prompt template for the Content Creator agent
  - **View and edit the Media Agent prompt**
  - Fetches and updates the prompt templates from the `content_templates` table
  - Simple text area or code editor for editing
  - Template variable management

## Backend Components
- **Supabase Database:** 
  - Enhanced schema for content, user sessions, history, tones
  - Proper JSON handling for structured data
  - Quality metrics storage
- **Edge Functions:** 
  - Content generation with template support
  - QA and optimization
  - Media search with custom descriptions
  - Enhanced error handling
- **Agents:** Modular services for each function
- **Vector Store:** For fact-checking and retrieval
- **Scraping Agent:** (Phase 2) Gathers novel content from forums/socials
