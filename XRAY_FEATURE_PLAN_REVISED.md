# XRAY Feature Implementation Plan (Final)

## Overview
A clean, simple XRAY feature that shows agent conversation flows with smart local storage and visual data flow between agents.

## ✅ Confirmed Requirements
- **No Claude**: All agents use OpenAI (GPT-4o-mini for Research, GPT-4o for Content, GPT-4 for Media)
- **No Advanced Features**: Focus on core conversation display and data flow
- **Smart Storage**: localStorage during generation, database only when content is saved
- **Data Flow Visualization**: Show how data passes between agents

## Architecture (Simplified)

### Database Schema
```sql
-- Only one simple table needed
CREATE TABLE agent_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content_id UUID REFERENCES generated_content(id) ON DELETE CASCADE,
    conversation_data JSONB NOT NULL, -- All conversations as JSON array
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Local Storage Structure
```typescript
interface XrayConversation {
  contentId: string;
  agents: AgentConversation[];
  dataFlow: DataFlowStep[];
}

interface AgentConversation {
  agentName: 'research_agent' | 'content_generator' | 'media_agent';
  order: number;
  messages: Message[];
  timing: { start: number; end?: number; duration?: number };
  tokens?: number;
  model: string;
}

interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
  timestamp: number;
}

interface DataFlowStep {
  from: string;
  to: string;
  data: any;
  summary: string; // Human readable description of what was passed
}
```

## Implementation Phases

### 🚀 Phase 1: Basic Infrastructure (This Week)
**Goal**: Get the XRAY page working with mock data

1. **XrayService** - localStorage management
2. **XrayPage** - basic page with tabs
3. **Navigation** - add X-Ray link to header
4. **Mock Data** - test with sample conversations

### 🔧 Phase 2: Agent Integration (Next Week)  
**Goal**: Capture real conversations from one agent

1. **Research Agent** - instrument to capture prompts/responses
2. **Frontend Integration** - connect XrayService to content generation
3. **Real Data Display** - show actual conversations

### 📊 Phase 3: Data Flow (Week 3)
**Goal**: Show how data flows between agents

1. **Data Flow Tracking** - capture what each agent passes to the next
2. **Visual Pipeline** - show agent boxes with arrows
3. **Interactive Flow** - click to see data transformations

## Phase 1 Implementation Plan

### 1. Create XrayService
```typescript
// src/services/xrayService.ts
export class XrayService {
  private static STORAGE_KEY = 'xray_conversations';
  
  // Start tracking a new content generation session
  static startSession(contentId: string): void
  
  // Log a conversation for an agent
  static logConversation(contentId: string, conversation: AgentConversation): void
  
  // Add data flow step
  static logDataFlow(contentId: string, flow: DataFlowStep): void
  
  // Get all conversations for a content ID
  static getSession(contentId: string): XrayConversation | null
  
  // Get current active session (latest)
  static getCurrentSession(): XrayConversation | null
  
  // Save to database when content is saved
  static saveToDatabase(contentId: string): Promise<void>
  
  // Clear old sessions (cleanup)
  static cleanup(): void
}
```

### 2. Create XrayPage
```typescript
// src/pages/XrayPage.tsx
- Tab navigation for agents
- Display current session conversations
- Handle case when no data available
- Simple message bubbles with role indicators
```

### 3. Add Navigation
```typescript
// src/components/layout/Header.tsx
// Add X-Ray link between Results and History
```

### 4. Create Basic Components
```typescript
// src/components/xray/
├── AgentTabs.tsx        # Tab navigation
├── ConversationList.tsx # List of messages for an agent
├── MessageBubble.tsx    # Individual message display
└── DataFlowDiagram.tsx  # Visual pipeline (Phase 3)
```

## Quick Start Commands

```bash
# Phase 1 commands to run:
mkdir -p src/components/xray
mkdir -p src/services
touch src/services/xrayService.ts
touch src/pages/XrayPage.tsx
touch src/components/xray/AgentTabs.tsx
touch src/components/xray/ConversationList.tsx
touch src/components/xray/MessageBubble.tsx
```

## Mock Data for Testing
```typescript
const mockXrayData: XrayConversation = {
  contentId: 'test-123',
  agents: [
    {
      agentName: 'research_agent',
      order: 1,
      messages: [
        { role: 'system', content: 'You are a Reddit research expert...', timestamp: Date.now() },
        { role: 'user', content: 'Find subreddits for "local SEO tips"', timestamp: Date.now() },
        { role: 'assistant', content: 'Top subreddits: r/SEO, r/smallbusiness...', timestamp: Date.now() }
      ],
      timing: { start: Date.now(), end: Date.now() + 2000, duration: 2000 },
      tokens: 1247,
      model: 'gpt-4o-mini'
    }
  ],
  dataFlow: [
    {
      from: 'research_agent',
      to: 'content_generator', 
      data: { enrichedPrompt: '...' },
      summary: 'Passed enriched prompt with Reddit insights'
    }
  ]
};
```

## Success Metrics
- **Phase 1**: XRAY page loads with mock data, shows agent tabs
- **Phase 2**: Real conversations captured from Research Agent  
- **Phase 3**: Visual data flow between agents working

## Next Steps
1. ✅ **Plan approved** - This document
2. 🚀 **Start Phase 1** - Create basic infrastructure
3. 🧪 **Test with mock data** - Ensure UI works
4. 🔗 **Integrate real agent** - Research Agent first
5. 📈 **Add data flow** - Visual pipeline

Ready to start Phase 1 implementation! 