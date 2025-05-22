# Architecture

The system is a modular, agent-based web application:

- **Frontend:** React (or similar) web UI, hosted on Netlify.
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
