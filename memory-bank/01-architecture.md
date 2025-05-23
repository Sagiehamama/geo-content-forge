# Architecture

The system is a modular, agent-based web application:

- **Frontend:** React (or similar) web UI, hosted on Netlify.
  - **State Management:** 
    - React Context API manages state persistence across navigation
    - Local storage backup for form data and generated content
    - Enhanced error handling and user feedback
  - **UI Components:** Shadcn UI library for consistent design
- **Backend:** Edge Functions with enhanced template support and error handling
- **Database:** Supabase with enhanced schema for structured data and quality metrics
- **Agents:**
  0. **Research Agent** (NEW)
     - Reddit-focused research for original insights
     - Subreddit discovery using LLM-based analysis
     - Web scraping via Puppeteer for posts and comments
     - Insight classification engine to identify valuable content
     - Generates enriched prompts for the Content Generator
     - Fallback handling when no insights are found
  1. Content Generator (LLM + web search/scraping)
     - Template-based generation with variable support
     - Enhanced YAML frontmatter handling
     - Quality metrics calculation
     - **Now receives enriched prompts from Research Agent when available**
  2. Content QA (fact-check, annotate)
  3. SEO + GEO Optimizer (on-page, metadata, internal linking)
  4. Repurpose Agent (short-form content for social platforms)
  5. **Media Agent** 
     - Analyzes generated Markdown
     - Identifies 1-3 logical image spots
     - Searches for relevant images online using:
       - AI-generated queries OR
       - User-provided custom descriptions
     - Returns 2-3 options per spot for user selection
     - Enhanced image placement logic
     - Better handling of alt text and captions
     - Prompt is stored in DB and editable via settings
- **Scraping Agent:** (Phase 2) Summarizes insights from forums/socials.

**Workflow Pipeline:**
1. User inputs content parameters
2. **Research Agent discovers Reddit insights and enriches prompt (optional)**
3. System generates content using templates (with optional enriched prompt)
4. Content processed for quality metrics
5. Media Agent provides image options
6. User selects images and reviews content
7. Content saved with proper state persistence
8. (Optional) Content repurposed for other platforms

**Data Flow:**
1. User inputs content parameters (stored in ContentContext + local storage)
2. **Research Agent (if enabled):**
   - Identifies relevant subreddits based on topic and company
   - Scrapes recent high-signal posts (15-30 posts)
   - Runs insight classification to shortlist 3 candidates
   - Rescrapes full threads for finalist posts
   - Generates one enriched content prompt or falls back to original
3. System generates content using templates (maintained in ContentContext)
   - **Uses enriched prompt from Research Agent when available**
4. Content processed for:
   - YAML frontmatter
   - Quality metrics
   - Proper formatting
5. Media Agent provides image options (stored in ContentContext)
   - Uses AI to analyze content and suggest image spots
   - OR uses user-provided custom descriptions
6. User selects images (selections in ContentContext)
7. Content saved to database with:
   - Proper JSON handling for structured data
   - Quality metrics
   - Image metadata
   - **Research insight metadata when applicable**
8. History page displays saved content with enhanced preview
   - **Shows Reddit insight used when applicable**
