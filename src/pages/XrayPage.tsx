import React, { useState, useEffect } from 'react';
import { XrayService, XrayConversation, AgentConversation } from '@/services/xrayService';
import { AgentTabs } from '@/components/xray/AgentTabs';
import { ConversationList } from '@/components/xray/ConversationList';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RefreshCw, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

const XrayPage: React.FC = () => {
  const [currentSession, setCurrentSession] = useState<XrayConversation | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<string>('research_agent');

  // Load current session on mount
  useEffect(() => {
    loadCurrentSession();
  }, []);

  const loadCurrentSession = () => {
    const current = XrayService.getCurrentSession();
    setCurrentSession(current);
  };

  const handleRefresh = () => {
    loadCurrentSession();
    toast.success('Session refreshed');
  };

  const handleClearAll = () => {
    if (confirm('Are you sure you want to clear all XRAY data? This cannot be undone.')) {
      XrayService.clearAll();
      setCurrentSession(null);
      toast.success('All XRAY data cleared');
    }
  };

  const getCurrentAgent = (): AgentConversation | null => {
    if (!currentSession) return null;
    return currentSession.agents.find(a => a.agentName === selectedAgent) || null;
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">X-Ray View</h1>
          <p className="text-muted-foreground">
            Inspect agent conversations and data flow for content generation sessions
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw size={16} />
            Refresh
          </Button>
          <Button variant="destructive" size="sm" onClick={handleClearAll}>
            <Trash2 size={16} />
            Clear All
          </Button>
        </div>
      </div>



      {/* Agent Conversations */}
      {currentSession ? (
        <div className="space-y-6">
          <AgentTabs
            selectedAgent={selectedAgent}
            onSelectAgent={setSelectedAgent}
            agents={currentSession.agents}
          />
          
          {getCurrentAgent() ? (
            <ConversationList agent={getCurrentAgent()!} />
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p>No conversation data recorded for {selectedAgent}</p>
            </div>
          )}
        </div>
      ) : (
        <Card>
          <CardContent className="text-center py-12">
            <div className="space-y-4">
              <div className="text-muted-foreground">
                <h3 className="text-lg font-medium">No Sessions Available</h3>
                <p>Generate content to see agent conversations here.</p>
                <p className="text-sm mt-2">
                  Go to the main form, create content, and return here to inspect the agent execution details.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default XrayPage; 