export interface XrayConversation {
  contentId: string;
  agents: AgentConversation[];
  dataFlow: DataFlowStep[];
  createdAt: number;
}

export interface XrayMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export interface XrayStep {
  id: string;
  type: 'ai_conversation' | 'logical_operation';
  name: string;
  description: string;
  timestamp: number;
  duration?: number;
  status: 'running' | 'completed' | 'failed';
  // For AI conversations
  messages?: XrayMessage[];
  model?: string;
  tokens?: number;
  // For logical operations
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface AgentConversation {
  agentName: 'research_agent' | 'content_generator' | 'media_agent';
  steps: XrayStep[];
  timing: { start: number; end: number; duration: number };
  tokens?: number;
  model: string;
  order: number;
  // Legacy support
  messages: XrayMessage[];
}

export interface DataFlowStep {
  from: string;
  to: string;
  data: Record<string, unknown>;
  summary: string; // Human readable description of what was passed
}

export class XrayService {
  private static STORAGE_KEY = 'xray_conversations';
  private static CURRENT_SESSION_KEY = 'xray_current_session';
  
  // Start tracking a new content generation session
  static startSession(contentId: string): void {
    const conversation: XrayConversation = {
      contentId,
      agents: [],
      dataFlow: [],
      createdAt: Date.now()
    };
    
    this.saveSession(conversation);
    localStorage.setItem(this.CURRENT_SESSION_KEY, contentId);
  }
  
  // Log a conversation for an agent
  static logConversation(contentId: string, conversation: AgentConversation): void {
    const session = this.getSession(contentId);
    if (!session) {
      console.warn(`No session found for contentId: ${contentId}`);
      return;
    }
    
    // Remove existing conversation for this agent and add the new one
    session.agents = session.agents.filter(a => a.agentName !== conversation.agentName);
    session.agents.push(conversation);
    
    // Sort by order
    session.agents.sort((a, b) => a.order - b.order);
    
    this.saveSession(session);
  }
  
  // Add data flow step
  static logDataFlow(contentId: string, flow: DataFlowStep): void {
    const session = this.getSession(contentId);
    if (!session) {
      console.warn(`No session found for contentId: ${contentId}`);
      return;
    }
    
    session.dataFlow.push(flow);
    this.saveSession(session);
  }
  
  // Get all conversations for a content ID
  static getSession(contentId: string): XrayConversation | null {
    try {
      const allSessions = this.getAllSessions();
      return allSessions.find(s => s.contentId === contentId) || null;
    } catch (error) {
      console.error('Error getting session:', error);
      return null;
    }
  }
  
  // Get current active session (latest)
  static getCurrentSession(): XrayConversation | null {
    try {
      const currentContentId = localStorage.getItem(this.CURRENT_SESSION_KEY);
      if (!currentContentId) return null;
      
      return this.getSession(currentContentId);
    } catch (error) {
      console.error('Error getting current session:', error);
      return null;
    }
  }
  
  // Get all sessions
  static getAllSessions(): XrayConversation[] {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error parsing sessions from localStorage:', error);
      return [];
    }
  }
  
  // Save session to localStorage
  private static saveSession(session: XrayConversation): void {
    try {
      const allSessions = this.getAllSessions();
      const existingIndex = allSessions.findIndex(s => s.contentId === session.contentId);
      
      if (existingIndex >= 0) {
        allSessions[existingIndex] = session;
      } else {
        allSessions.push(session);
      }
      
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(allSessions));
    } catch (error) {
      console.error('Error saving session to localStorage:', error);
    }
  }
  
  // Save to database when content is saved
  static async saveToDatabase(contentId: string): Promise<void> {
    // TODO: Implement database saving in Phase 2
    console.log(`Saving session ${contentId} to database (not implemented yet)`);
  }
  
  // Clear old sessions (cleanup) - keep only last 10
  static cleanup(): void {
    try {
      const allSessions = this.getAllSessions();
      if (allSessions.length > 10) {
        // Sort by creation time and keep only the latest 10
        const sorted = allSessions.sort((a, b) => b.createdAt - a.createdAt);
        const keepSessions = sorted.slice(0, 10);
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(keepSessions));
      }
    } catch (error) {
      console.error('Error during cleanup:', error);
    }
  }
  
  // Clear all sessions (for testing)
  static clearAll(): void {
    localStorage.removeItem(this.STORAGE_KEY);
    localStorage.removeItem(this.CURRENT_SESSION_KEY);
  }
} 