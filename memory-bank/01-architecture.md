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
  1. Content Generator (LLM + web search/scraping)
     - Template-based generation with variable support
     - Enhanced YAML frontmatter handling
     - Quality metrics calculation
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
2. System generates content using templates
3. Content processed for quality metrics
4. Media Agent provides image options
5. User selects images and reviews content
6. Content saved with proper state persistence
7. (Optional) Content repurposed for other platforms

**Data Flow:**
1. User inputs content parameters (stored in ContentContext + local storage)
2. System generates content using templates (maintained in ContentContext)
3. Content processed for:
   - YAML frontmatter
   - Quality metrics
   - Proper formatting
4. Media Agent provides image options (stored in ContentContext)
   - Uses AI to analyze content and suggest image spots
   - OR uses user-provided custom descriptions
5. User selects images (selections in ContentContext)
6. Content saved to database with:
   - Proper JSON handling for structured data
   - Quality metrics
   - Image metadata
7. History page displays saved content with enhanced preview
