# XRAY Feature Implementation Plan

## Overview
The XRAY feature provides transparency into the multi-agent workflow by capturing and displaying the complete conversation flow between agents and AI engines. This enhances explainability and helps users understand how their content was generated.

## Current Architecture Analysis

### Existing Agents
1. **Research Agent** (✅ Implemented)
   - Reddit API integration with Anthropic Claude
   - Subreddit discovery and insight classification
   - Prompt enrichment workflow

2. **Content Generator** (✅ Implemented)
   - OpenAI GPT-4o integration
   - Template-based content generation
   - Database storage integration

3. **Media Agent** (✅ Implemented)
   - OpenAI GPT-4 for image spot analysis
   - Unsplash API integration
   - Database-driven prompt management

4. **SEO Agent** (📋 Planned)
   - Not yet implemented

## Database Schema Design

### New Tables (See xray_schema.sql)
- `agent_conversations`: Tracks each agent execution with timing and status
- `conversation_messages`: Stores individual AI messages (system, user, assistant)
- `agent_execution_metadata`: Captures input/output data and performance metrics

### Key Design Decisions
- **Conversation Tracking**: Each agent gets a conversation record linked to content_id
- **Message Storage**: All AI interactions stored with role, content, and metadata
- **Performance Metrics**: Token usage, timing, model information captured
- **Error Handling**: Failed conversations and error logs stored for debugging

## Frontend Implementation

### 1. Navigation Updates
```typescript
// Add XRAY route between Results and History
<NavLink to="/xray" className={...}>
  X-Ray
</NavLink>
```

### 2. XrayPage Component Structure
```
src/pages/XrayPage.tsx
├── Agent Tab Navigation (Research, Content Gen, Media, SEO)
├── Conversation Timeline for each agent
└── Message Display with role indicators
```

### 3. Component Architecture
```
src/components/xray/
├── XrayTabs.tsx          # Agent tab navigation
├── ConversationView.tsx  # Message timeline for an agent
├── MessageBubble.tsx     # Individual message display
├── AgentMetrics.tsx      # Performance stats
└── ConversationFilter.tsx # Filter by content/date
```

## Backend Integration Points

### 1. Edge Function Modifications
Each edge function needs instrumentation to capture conversations:

**Research Agent (`supabase/functions/research-agent/index.ts`)**
- Capture subreddit discovery prompts and responses
- Store insight classification conversations
- Track Reddit API calls and processing time

**Content Generator (`supabase/functions/generate-content/index.ts`)**
- Store system and user prompts sent to OpenAI
- Capture OpenAI responses
- Track template usage and content generation flow

**Media Agent (`supabase/functions/media-agent/index.ts`)**
- Record image analysis prompts
- Store AI responses for image spot identification
- Track Unsplash API interactions

### 2. Conversation Capture Service
```typescript
// New service: src/services/conversationService.ts
export interface ConversationLogger {
  startConversation(agentName: string, contentId: string): Promise<string>;
  logMessage(conversationId: string, role: string, content: string, metadata?: any): Promise<void>;
  completeConversation(conversationId: string, status: string): Promise<void>;
}
```

## User Experience Design

### 1. Tab Layout
```
[Research Agent] [Content Generator] [Media Agent] [SEO Agent]
```

### 2. Conversation Display
```
┌─ RESEARCH AGENT CONVERSATION ─────────────────────┐
│ 🤖 SYSTEM: You are a Reddit research expert...    │
│ 👤 USER: Find subreddits for "local SEO tips"     │
│ 🤖 ASSISTANT: Based on analysis, top subreddits:  │
│    • r/SEO (relevance: 9/10)                      │
│    • r/smallbusiness (relevance: 8/10)            │
│                                                    │
│ ⏱️ Processing Time: 2.3s | 🎯 Tokens: 1,247      │
└────────────────────────────────────────────────────┘
```

### 3. Visual Indicators
- **Role Icons**: System (🤖), User (👤), Assistant (🤖)
- **Status Badges**: Success ✅, In Progress ⏳, Error ❌
- **Metrics Display**: Processing time, token usage, model used
- **Collapsible Sections**: Large responses can be collapsed

## Implementation Phases

### Phase 1: Database & Core Infrastructure
1. Create database migration for XRAY tables
2. Build conversation logging service
3. Add basic XRAY page with tab navigation

### Phase 2: Agent Instrumentation
1. Modify Research Agent to log conversations
2. Modify Content Generator to log conversations
3. Modify Media Agent to log conversations

### Phase 3: UI Polish & Features
1. Message display components with syntax highlighting
2. Performance metrics dashboard
3. Conversation filtering and search
4. Export conversation data functionality

### Phase 4: Advanced Features
1. Conversation diff comparison
2. Performance analytics over time
3. Agent optimization suggestions
4. A/B testing for prompt variations

## Technical Considerations

### 1. Performance Impact
- **Database Growth**: Conversations will increase database size significantly
- **Edge Function Latency**: Logging adds ~50-100ms per request
- **Memory Usage**: Large conversations need efficient loading
- **Solution**: Implement conversation archiving and lazy loading

### 2. Privacy & Security
- **Sensitive Data**: User prompts and company info in conversations
- **Data Retention**: Implement conversation expiry policies
- **Access Control**: Ensure users only see their own conversations

### 3. Token Cost Tracking
- **OpenAI Usage**: Track token consumption for cost analysis
- **Anthropic Usage**: Track Claude API usage
- **Budget Alerts**: Warn users about high token usage

## Value Propositions

### For Content Creators
1. **Understanding AI Decisions**: See exactly how agents interpreted their prompts
2. **Prompt Optimization**: Learn what works best with each agent
3. **Quality Assurance**: Verify that AI followed instructions correctly
4. **Learning Tool**: Understand how multi-agent systems work

### For Developers/Admins
1. **Debugging**: Identify where agent workflows fail
2. **Performance Monitoring**: Track agent response times and quality
3. **Cost Management**: Monitor API usage and optimize prompts
4. **Model Comparison**: A/B test different AI models and prompts

### For Business Intelligence
1. **Usage Analytics**: Which agents are most effective?
2. **Content Insights**: What types of prompts generate best content?
3. **ROI Tracking**: Cost per piece of content generated
4. **Process Optimization**: Identify bottlenecks in the workflow

## Missing Opportunities

### 1. Agent Interaction Flows
- **Current**: Agents work in sequence (Research → Content → Media)
- **Enhancement**: Show how agents pass data between each other
- **Value**: Users understand the complete pipeline, not just individual steps

### 2. Confidence Scoring
- **Current**: No confidence metrics from agents
- **Enhancement**: Each agent provides confidence in its output
- **Value**: Users know when to manually review or re-run agents

### 3. Alternative Path Exploration
- **Current**: Single execution path per content generation
- **Enhancement**: Show alternative approaches the AI considered
- **Value**: Users can explore "what if" scenarios

### 4. Interactive Debugging
- **Current**: Static conversation display
- **Enhancement**: Allow users to modify prompts and re-run specific agents
- **Value**: Iterative improvement without full regeneration

### 5. Prompt Templates Analytics
- **Current**: Basic template usage tracking
- **Enhancement**: Success rates and optimization suggestions per template
- **Value**: Data-driven prompt engineering

## Next Steps

1. **Validate Approach**: Review this plan with your requirements
2. **Schema Creation**: Run the database migration
3. **Start Small**: Begin with Research Agent instrumentation
4. **Iterate**: Build one tab at a time, test with real data
5. **Expand**: Add more sophisticated features based on user feedback

Would you like me to start implementing any specific part of this plan? 