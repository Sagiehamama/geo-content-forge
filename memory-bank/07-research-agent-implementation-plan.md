# Research Agent Implementation Plan

## Phase 1: Database Schema & Core Infrastructure (Day 1)

### Database Updates
1. Create research insights table
2. Create subreddit cache table  
3. Update content_items table to reference research insights
4. Add research-related fields to existing tables

### Commands to run:
```bash
# Create new migration for research agent schema
npx supabase migration new research_agent_schema
# Edit the migration file with the SQL schema
# Run migration
npx supabase db push
```

### Backend Foundation
1. Create research-agent edge function directory structure
2. Set up TypeScript interfaces and types
3. Add Puppeteer dependency to edge function
4. Create basic error handling and logging

## Phase 2: Reddit Scraping Engine (Day 2)

### Core Scraping Components
1. `reddit-scraper.ts` - Puppeteer-based Reddit scraper
   - Handle Reddit's anti-bot measures
   - Extract post metadata (title, body, upvotes, comments)
   - Support for both old and new Reddit formats
   - Rate limiting and request pacing

2. `subreddit-discovery.ts` - LLM-powered subreddit identification
   - Prompt template for subreddit discovery
   - Validation of subreddit existence and activity
   - Caching mechanism for performance

### Commands to run:
```bash
# Install Puppeteer in edge function
cd supabase/functions/research-agent
npm install puppeteer-core @sparticuz/chromium
```

## Phase 3: Insight Classification Engine (Day 3)

### Classification Components
1. `insight-classifier.ts` - Multi-step insight evaluation
   - Batch analysis for initial screening
   - Individual thread analysis for finalists
   - Scoring and ranking system

2. `prompt-enricher.ts` - Final prompt generation
   - Template-based prompt enrichment
   - Context preservation from original prompt
   - Fallback handling for edge cases

### Integration Points
- Connect to existing LLM service
- Add proper error handling and retries
- Implement caching for classification results

## Phase 4: UI Integration (Day 4)

### Frontend Updates
1. **Input Page (`src/pages/InputPage.tsx`)**
   - Add company description field
   - Add research toggle switch
   - Update form validation and state management

2. **Results Page (`src/pages/ResultsPage.tsx`)**
   - Add research insight display component
   - Show enriched prompt when research successful
   - Display fallback message when no insights found
   - Add link to original Reddit post

3. **ContentContext Updates (`src/context/ContentContext.tsx`)**
   - Add research-related state variables
   - Handle research agent responses
   - Persist research metadata

### Commands to run:
```bash
# No specific commands - just code changes
# Test UI changes in development mode
npm run dev
```

## Phase 5: Main Research Agent Function (Day 5)

### Core Integration
1. **Main Handler (`supabase/functions/research-agent/index.ts`)**
   - Orchestrate the full research pipeline
   - Handle async operations and timeouts
   - Manage error states and fallbacks
   - Return structured response to frontend

2. **Integration with Content Generator**
   - Modify content generation to accept enriched prompts
   - Pass research metadata through the pipeline
   - Update database with research information

### Commands to run:
```bash
# Deploy research agent function
npx supabase functions deploy research-agent

# Test the function
curl -X POST 'http://localhost:54321/functions/v1/research-agent' \
  -H 'Content-Type: application/json' \
  -d '{"prompt": "test prompt", "company": "test company"}'
```

## Phase 6: Settings & Template Management (Day 6)

### Settings Integration
1. **Add Research Agent Prompts to Settings**
   - Subreddit discovery prompt template
   - Insight classification prompt template  
   - Final enrichment prompt template

2. **Database Template Storage**
   - Add research agent templates to content_templates table
   - Create default templates with variables
   - Enable template editing through settings UI

### Commands to run:
```bash
# Insert default templates into database
npx supabase db reset --linked
# Or run SQL insert statements directly
```

## Phase 7: History Page Updates (Day 7)

### History Enhancements
1. **Research Indicators**
   - Visual badge for research-enhanced content
   - Filter for content with research insights
   - Display research metadata in previews

2. **Research Details View**
   - Show original vs enriched prompt comparison
   - Link to Reddit post used
   - Research metadata and timestamps

## Phase 8: Testing & Performance Optimization (Day 8)

### Comprehensive Testing
1. **End-to-End Testing**
   - Test full research pipeline with real Reddit data
   - Verify fallback scenarios work correctly
   - Test rate limiting and error handling

2. **Performance Optimization**
   - Implement subreddit caching
   - Optimize scraping speed vs accuracy
   - Monitor edge function execution times

### Commands to run:
```bash
# Run comprehensive tests
npm test

# Monitor edge function performance  
npx supabase functions logs research-agent

# Load testing if needed
# Custom script to test multiple concurrent requests
```

## Phase 9: Documentation & Final Polish (Day 9)

### Documentation
1. **User Documentation**
   - How to use Research Agent feature
   - Best practices for company descriptions
   - Understanding research insights

2. **Developer Documentation**
   - API documentation for research agent
   - Troubleshooting guide
   - Performance tuning guide

### Final Testing
- User acceptance testing
- Performance validation
- Security review of scraping implementation

## Implementation Notes

### Key Dependencies
```json
{
  "puppeteer-core": "^21.0.0",
  "@sparticuz/chromium": "^116.0.0",
  "crypto": "built-in" // for hashing topic+company for cache
}
```

### Environment Variables Needed
```
OPENAI_API_KEY=# Already exists
REDDIT_USER_AGENT=# For scraping identification
```

### Critical Success Factors
1. **Robust Error Handling** - Research failures shouldn't break content generation
2. **Performance** - Keep research under 30-60 seconds total
3. **Rate Limiting** - Respect Reddit's informal rate limits
4. **User Experience** - Clear progress indicators and transparent outcomes
5. **Fallback Quality** - Ensure original prompt experience remains excellent

### Potential Challenges
1. **Reddit Anti-Bot Measures** - May need rotating user agents, proxies
2. **Content Quality** - LLM classification needs fine-tuning
3. **Performance** - Full pipeline could be slow without optimization
4. **Rate Limits** - May hit Reddit or LLM API limits with heavy usage

### Success Metrics to Track
- Research completion rate (target: >90%)
- Insight discovery rate (target: >50% of research attempts find usable insights)
- Performance (target: <60 seconds end-to-end)
- User adoption (target: >30% of content uses research feature)

This plan provides a systematic approach to implementing the Research Agent while maintaining the existing system's stability and performance. 