# Components

## UI Components
- **Input Page:**
  - User prompt, location, language, tone, media, word count
  - Geolocation API for location
  - Tone presets saved to user profile
- **Results Page:**
  - Preview (Markdown rendering)
  - QA Score + Annotations
  - Editable prompt for regen/tweaks
  - Repurpose Agent launcher
  - Save to History
  - **Media selection UI:** For each image spot, user can select from 2-3 image options (or none, in which case a nice placeholder is shown)
- **History Page:**
  - List, view, edit, repurpose saved articles/snippets
  - Filters by date, topic, status
- **Settings Tab/Page:**
  - View and edit the system prompt template for the Content Creator agent.
  - **View and edit the Media Agent prompt.**
  - Fetches and updates the prompt templates from the `content_templates` table in the database.
  - Simple text area or code editor for editing.

## Backend Components
- **Supabase/Firebase DB:** Content, user sessions, history, tones
- **Supabase Functions/Node/Python API:** Content generation, QA, optimization, repurposing, **media search**
- **Agents:** Modular services for each function
- **Vector Store:** For fact-checking and retrieval
- **Scraping Agent:** (Phase 2) Gathers novel content from forums/socials
