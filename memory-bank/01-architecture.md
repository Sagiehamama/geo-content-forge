# Architecture Overview

## System Architecture

**Frontend**: React TypeScript application with Tailwind CSS
**Backend**: Supabase (PostgreSQL + Edge Functions)
**AI Integration**: OpenAI API and Anthropic Claude API
**Authentication**: Supabase Auth

## Multi-Agent System

### Agent #0: Research Agent ✅ IMPLEMENTED
**Purpose**: Discovery and integration of Reddit insights into content prompts
**Implementation**: Supabase Edge Function with Reddit API integration
**Technology Stack**:
- Reddit JSON API for post scraping
- Anthropic Claude for subreddit discovery and insight classification
- PostgreSQL caching for performance optimization
- TypeScript with modular design

**Workflow**:
1. Input processing and validation
2. LLM-powered subreddit discovery with caching
3. Reddit post scraping with rate limiting
4. Multi-step insight classification and analysis
5. Prompt enrichment maintaining original intent
6. Results display with source attribution

**Database Integration**:
- `research_insights` table for storing research results
- `subreddit_cache` table for 7-day caching optimization
- Links to `generated_content` for attribution

### Agent #1: Content Generator
**Purpose**: Primary content generation using enriched prompts
**Technology**: OpenAI GPT models
**Input**: Original or research-enriched prompts
**Output**: High-quality blog posts with structured content

### Agent #2: SEO Agent
**Purpose**: SEO optimization and metadata generation
**Technology**: OpenAI GPT models
**Integration**: Post-processes content from Content Generator

### Agent #3: Media Agent ✅ IMPLEMENTED
**Purpose**: Image search and visual content suggestions
**Implementation**: Supabase Edge Function with Unsplash API integration
**Technology Stack**:
- Unsplash API for stock photo search
- OpenAI GPT-4 for intelligent image spot identification
- PostgreSQL for prompt template storage
- TypeScript with query simplification logic

**Database Integration**:
- **CRITICAL**: Media Agent prompt is stored in `content_templates` table (`media_agent_prompt` field)
- Prompt is editable via Settings page - NOT hardcoded in edge function
- Only minimal fallback prompt exists in code for emergency cases
- All prompt improvements must be made via Settings page to update database

**Key Features**:
- AI-suggested image placement analysis
- Intelligent search query simplification (complex queries → simple 1-3 word terms)
- Custom image description search capability
- Automatic fallback for complex/specific location queries
- Query mapping system (e.g., "Geneva to Chamonix" → "mountains")

**Workflow**:
1. Receives markdown content from frontend
2. Fetches current media agent prompt from `content_templates` table
3. AI analyzes content and suggests 1-3 optimal image spots
4. Simplifies complex search queries for better Unsplash results
5. Returns structured image options for each spot

## Database Schema

### Core Content Tables
```sql
generated_content (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    prompt TEXT NOT NULL,
    content JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE
)
```

### Research Agent Tables ✅ IMPLEMENTED
```sql
research_insights (
    id UUID PRIMARY KEY,
    content_item_id UUID REFERENCES generated_content(id),
    original_prompt TEXT NOT NULL,
    enriched_prompt TEXT NOT NULL,
    subreddits TEXT[] NOT NULL,
    insights JSONB NOT NULL,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE
)

subreddit_cache (
    id UUID PRIMARY KEY,
    topic_hash TEXT UNIQUE NOT NULL,
    subreddits TEXT[] NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE
)
```

## Edge Functions

### Research Agent Function ✅ IMPLEMENTED
**Endpoint**: `/functions/v1/research-agent`
**Purpose**: Complete Reddit research workflow
**Architecture**:
```
supabase/functions/research-agent/
├── index.ts              # Main orchestration
├── reddit-scraper.ts     # Reddit API integration
├── subreddit-discovery.ts # LLM subreddit finding
├── insight-classifier.ts # LLM insight analysis  
├── prompt-enricher.ts    # Prompt enhancement
└── types.ts             # TypeScript interfaces
```

**Key Features**:
- Reddit JSON API integration (replacing Puppeteer for edge function compatibility)
- Anthropic Claude integration with markdown parsing
- PostgreSQL caching with 7-day TTL
- Rate limiting and error recovery
- Modular design for maintainability

### Media Agent Function ✅ IMPLEMENTED
**Endpoint**: `/functions/v1/media-agent`
**Purpose**: Intelligent image search and placement for blog content
**Architecture**:
```
supabase/functions/media-agent/
└── index.ts              # Main function with AI analysis and Unsplash integration
```

**Key Features**:
- **Database-driven prompts**: Fetches AI prompt from `content_templates.media_agent_prompt`
- **Query simplification**: Automatically converts complex queries to simple Unsplash-friendly terms
- **Dual operation modes**: AI-generated suggestions OR custom user descriptions
- **Smart fallbacks**: Handles API failures and complex query scenarios
- **Structured output**: Returns 1-3 image spots with multiple options each

**IMPORTANT**: 
- The AI prompt is stored in the database and editable via Settings page
- Do NOT modify the DEFAULT_MEDIA_AGENT_PROMPT in code - it's only a minimal fallback
- All prompt improvements must be made via the Settings UI to update the database

### Content Generation Function ✅ IMPLEMENTED
**Endpoint**: `/functions/v1/generate-content`
**Purpose**: Primary content generation using template-based prompts
**Architecture**:
```
supabase/functions/generate-content/
└── index.ts              # Main function with template processing and OpenAI integration
```

**Key Features**:
- **Database-driven templates**: Fetches prompts from `content_templates` table
- **Template variable processing**: Handles `${variable}` substitution with Function constructor
- **Quote handling**: Processes both quoted and unquoted template variables
- **OpenAI integration**: Uses GPT-4o model for content generation
- **Error handling**: Comprehensive error recovery and logging

## Template Processing System ✅ IMPLEMENTED

### Template Variable Architecture
**Storage**: All prompt templates stored in `content_templates` database table
**Processing**: Edge functions use Function constructor for safe template literal evaluation
**Variables**: Support for `prompt`, `company`, `wordCount`, `includeImages`, `includeFrontmatter`

### Template Processing Workflow
1. **Fetch Template**: Edge function retrieves current template from database
2. **Clean Template**: Removes quotes around template variables (`"${prompt}"` → `${prompt}`)
3. **Variable Setup**: Prepares all required variables from form data
4. **Safe Evaluation**: Uses Function constructor to process template literals
5. **Content Generation**: Processed prompt sent to AI model

### Critical Fixes Applied ✅
- **Quote Handling**: Template processing handles both `"${variable}"` and `${variable}` formats
- **Missing Variables**: Fixed `ReferenceError: wordCount is not defined` by adding all variables to Function constructor
- **Template Validation**: Settings page validates templates for required placeholders
- **Deployment**: All edge functions updated and deployed with fixes

### Template Management
- **Settings UI**: All templates editable via Settings page
- **Validation**: Real-time template validation prevents deployment of broken templates
- **Fallbacks**: Minimal fallback templates in code for emergency scenarios only
- **Version Control**: Database-driven approach ensures consistent template updates

### Content Generation Functions
- Content generation with multiple AI models
- SEO optimization and analysis
- Media search and management
- Quality metrics and scoring

## Frontend Architecture

### State Management
**Primary**: React Context (ContentContext)
**Persistence**: Local storage backup
**Scope**: Cross-page content state and media management

### Routing Structure
```
/ (Home/Input) - Content creation interface with research toggle
/results - Generated content display with research attribution
/history - Content management and research insights
/settings - Configuration and agent management
```

### Component Structure
```
src/
├── components/
│   ├── research/         # Research Agent UI components ⏳ PLANNED
│   │   ├── ResearchToggle.tsx
│   │   ├── ResearchProgress.tsx
│   │   ├── InsightCard.tsx
│   │   └── ResearchResults.tsx
│   ├── content/         # Content generation components
│   ├── media/           # Media Agent components  
│   └── ui/              # Shared UI components
├── contexts/            # React Context providers
├── hooks/               # Custom React hooks
└── utils/               # Utility functions
```

## Integration Flow

### Standard Content Generation
1. User inputs prompt and selects agents
2. Content flows through agent pipeline
3. Results displayed with media suggestions
4. Content saved to history

### Research-Enhanced Generation ✅ BACKEND COMPLETE
1. User enables research toggle
2. Research Agent processes prompt:
   - Discovers relevant subreddits (cached)
   - Scrapes recent Reddit posts
   - Classifies insights using LLM
   - Enriches original prompt
3. Enhanced prompt flows to Content Generator
4. Results include research attribution and insights
5. Research metadata stored for future reference

## Performance Optimizations

### Research Agent Optimizations ✅ IMPLEMENTED
- **Caching**: 7-day subreddit cache reduces API calls
- **Parallel Processing**: Concurrent subreddit analysis
- **Rate Limiting**: Respects Reddit API limits
- **Bundle Optimization**: 80.96kB edge function bundle
- **Error Recovery**: Graceful fallbacks maintain workflow

### General Optimizations
- Local storage state backup
- Lazy loading for images
- Efficient API batching
- Responsive design patterns

## Security & Error Handling

### Research Agent Security ✅ IMPLEMENTED
- Rate limiting to prevent abuse
- Input validation and sanitization
- Error boundaries with fallback behavior
- Secure API key management in edge functions

### General Security
- Supabase RLS (Row Level Security)
- Environment variable protection
- CORS configuration
- Input sanitization across all agents

## Deployment

### Current Status
- ✅ **Frontend**: Deployed React application
- ✅ **Backend**: Supabase with all edge functions
- ✅ **Research Agent**: Fully deployed and operational
- ✅ **Database**: Schema complete with research tables

### Monitoring
- Edge function performance metrics
- Database query optimization
- API rate limit monitoring
- Error tracking and alerting
