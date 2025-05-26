import React from 'react';
import { AgentConversation } from '@/services/xrayService';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Network, BrainCircuit, Layers, Clock, Zap } from 'lucide-react';

interface AgentTabsProps {
  selectedAgent: string;
  onSelectAgent: (agent: string) => void;
  agents: Array<{
    agentName: string;
    timing?: { duration: number };
    tokens?: number;
    model?: string;
  }>;
}

const agentConfig = {
  research_agent: {
    icon: Network,
    label: 'Research Agent',
    description: 'Reddit insights & subreddit discovery',
    color: 'bg-blue-500'
  },
  content_generator: {
    icon: BrainCircuit,
    label: 'Content Generator',
    description: 'AI-powered content creation',
    color: 'bg-green-500'
  },
  media_agent: {
    icon: Layers,
    label: 'Media Agent',
    description: 'Image suggestions & placement',
    color: 'bg-purple-500'
  }
} as const;

export const AgentTabs = ({ selectedAgent, onSelectAgent, agents }: AgentTabsProps) => {
  const getAgentIcon = (name: string) => {
    switch (name) {
      case 'research_agent':
        return '🔍';
      case 'content_generator':
        return '🧠';
      case 'media_agent':
        return '🎨';
      default:
        return '🤖';
    }
  };

  const getAgentLabel = (name: string) => {
    switch (name) {
      case 'research_agent':
        return 'Research Agent';
      case 'content_generator':
        return 'Content Generator';
      case 'media_agent':
        return 'Media Agent';
      default:
        return name;
    }
  };

  const formatDuration = (ms: number): string => {
    if (ms < 1000) return `${ms}ms`;
    const seconds = (ms / 1000).toFixed(1);
    return `${seconds}s`;
  };

  const formatTokens = (tokens: number): string => {
    if (tokens >= 1000) {
      return `${(tokens / 1000).toFixed(1)}k`;
    }
    return tokens.toString();
  };

  return (
    <Tabs value={selectedAgent} onValueChange={onSelectAgent}>
      <TabsList className="w-full justify-start">
        {agents.map((agent) => (
          <TabsTrigger
            key={agent.agentName}
            value={agent.agentName}
            className="flex items-center gap-2"
          >
            <span>{getAgentIcon(agent.agentName)}</span>
            <span>{getAgentLabel(agent.agentName)}</span>
            {agent.timing && (
              <span className="text-xs text-gray-500 ml-2">
                {(agent.timing.duration / 1000).toFixed(1)}s
              </span>
            )}
          </TabsTrigger>
        ))}
      </TabsList>
      
      {agents.map((agent) => {
        const config = agentConfig[agent.agentName];
        const Icon = config.icon;
        
        return (
          <TabsContent key={agent.agentName} value={agent.agentName} className="mt-6">
            <div className="space-y-4">
              {/* Agent Header */}
              <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${config.color} text-white`}>
                    <Icon size={20} />
                  </div>
                  <div>
                    <h3 className="font-semibold">{config.label}</h3>
                    <p className="text-sm text-muted-foreground">{config.description}</p>
                  </div>
                </div>
                
                {agent.timing && (
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Clock size={14} />
                      <span>{formatDuration(agent.timing.duration)}</span>
                    </div>
                    {agent.tokens && (
                      <div className="flex items-center gap-1">
                        <Zap size={14} />
                        <span>{formatTokens(agent.tokens)} tokens</span>
                      </div>
                    )}
                    <Badge variant="outline" className="text-xs">
                      {agent.model}
                    </Badge>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
        );
      })}
    </Tabs>
  );
}; 