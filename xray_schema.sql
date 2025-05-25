-- New table to store agent conversation flows
CREATE TABLE agent_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content_id UUID REFERENCES generated_content(id) ON DELETE CASCADE,
    agent_name TEXT NOT NULL, -- 'research_agent', 'content_generator', 'media_agent', 'seo_agent'
    conversation_order INTEGER NOT NULL, -- Order of execution (1, 2, 3...)
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    status TEXT DEFAULT 'pending', -- 'pending', 'in_progress', 'completed', 'failed'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Store individual messages in agent conversations
CREATE TABLE conversation_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES agent_conversations(id) ON DELETE CASCADE,
    message_order INTEGER NOT NULL, -- Order within conversation
    role TEXT NOT NULL, -- 'system', 'user', 'assistant'
    content TEXT NOT NULL,
    tokens_used INTEGER,
    model_used TEXT, -- 'gpt-4o', 'claude-3', etc.
    processing_time_ms INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Agent execution metadata and results
CREATE TABLE agent_execution_metadata (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES agent_conversations(id) ON DELETE CASCADE,
    input_data JSONB, -- Original input to the agent
    output_data JSONB, -- Final output from the agent
    intermediate_results JSONB, -- Any intermediate processing results
    error_logs TEXT,
    performance_metrics JSONB, -- timing, token usage, etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_agent_conversations_content_id ON agent_conversations(content_id);
CREATE INDEX idx_conversation_messages_conversation_id ON conversation_messages(conversation_id);
CREATE INDEX idx_agent_execution_metadata_conversation_id ON agent_execution_metadata(conversation_id); 