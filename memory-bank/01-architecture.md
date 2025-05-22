# Architecture

The system is a modular, agent-based web application:

- **Frontend:** React (or similar) web UI, hosted on Netlify.
  - **State Management:** React Context API manages state persistence across navigation
  - **UI Components:** Shadcn UI library for consistent design
- **Backend:** Node.js or Python (FastAPI), integrates with LLM providers, vector store, and scraping agent.
- **Database:** Supabase or Firebase for content, user sessions, history, saved tones, etc.
- **Agents:**
  1. Content Generator (LLM + web search/scraping)
  2. Content QA (fact-check, annotate)
  3. SEO + GEO Optimizer (on-page, metadata, internal linking)
  4. Repurpose Agent (short-form content for social platforms)
  5. **Media Agent** (analyzes generated Markdown, identifies 1-3 logical image spots, searches for relevant images online, and returns 2-3 options per spot for user selection; prompt is stored in DB and editable via settings; no image generation for now)
- **Scraping Agent:** (Phase 2) Summarizes insights from forums/socials.

**Workflow Pipeline:**
Input JSON → Content Generator → QA Agent → Optimizer → Markdown Output → **Media Agent (image search/selection)** → User Review/Save → (Optional) Repurpose Agent → Publish

**Data Flow:**
1. User inputs content parameters (stored in ContentContext)
2. System generates content (maintained in ContentContext)
3. Media Agent provides image options (stored in ContentContext)
4. User selects images and reviews content (selections in ContentContext)
5. User saves content to database
6. History page displays saved content from database
