import React from 'react';
import { XrayConversation } from '@/services/xrayService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, Network, BrainCircuit, Layers, Clock, Zap } from 'lucide-react';

interface DataFlowVisualizationProps {
  session: XrayConversation;
}

const agentConfig = {
  research_agent: {
    icon: Network,
    label: 'Research',
    fullLabel: 'Research Agent',
    color: 'bg-blue-500',
    textColor: 'text-blue-700',
    description: 'Found Reddit insights'
  },
  content_generator: {
    icon: BrainCircuit,
    label: 'Content',
    fullLabel: 'Content Generator',
    color: 'bg-green-500',
    textColor: 'text-green-700',
    description: 'Created article content'
  },
  media_agent: {
    icon: Layers,
    label: 'Media',
    fullLabel: 'Media Agent',
    color: 'bg-purple-500',
    textColor: 'text-purple-700',
    description: 'Selected image locations'
  }
} as const;

export const DataFlowVisualization: React.FC<DataFlowVisualizationProps> = ({ session }) => {
  if (!session.agents.length) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          <p>No agents executed yet</p>
        </CardContent>
      </Card>
    );
  }

  const executedAgents = session.agents.sort((a, b) => a.order - b.order);
  const totalTime = executedAgents.reduce((sum, agent) => sum + (agent.timing?.duration || 0), 0);
  const totalTokens = executedAgents.reduce((sum, agent) => sum + (agent.tokens || 0), 0);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            Quick Overview
          </CardTitle>
          <Badge variant="secondary" className="text-xs">
            {executedAgents.length} agents executed
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Simple Pipeline Visual */}
        <div className="flex items-center justify-center p-4 bg-muted/30 rounded-lg">
          {executedAgents.map((agent, index) => {
            const config = agentConfig[agent.agentName];
            const Icon = config.icon;
            const isLast = index === executedAgents.length - 1;
            
            return (
              <div key={agent.agentName} className="flex items-center space-x-3">
                <div className="flex flex-col items-center space-y-2">
                  <div className={`p-3 rounded-lg ${config.color} text-white relative`}>
                    <Icon size={20} />
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-white"></div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs font-medium">{config.label}</div>
                    <div className="text-xs text-muted-foreground">{config.description}</div>
                  </div>
                </div>
                {!isLast && (
                  <ArrowRight className="text-muted-foreground" size={16} />
                )}
              </div>
            );
          })}
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="space-y-1">
            <div className="text-2xl font-bold text-blue-600">{executedAgents.length}</div>
            <div className="text-xs text-muted-foreground">Agents Used</div>
          </div>
          <div className="space-y-1">
            <div className="text-2xl font-bold text-green-600 flex items-center justify-center gap-1">
              <Clock size={16} />
              {totalTime < 1000 ? `${totalTime}ms` : `${(totalTime / 1000).toFixed(1)}s`}
            </div>
            <div className="text-xs text-muted-foreground">Total Time</div>
          </div>
          <div className="space-y-1">
            <div className="text-2xl font-bold text-purple-600 flex items-center justify-center gap-1">
              <Zap size={16} />
              {totalTokens >= 1000 ? `${(totalTokens / 1000).toFixed(1)}k` : totalTokens}
            </div>
            <div className="text-xs text-muted-foreground">Tokens Used</div>
          </div>
        </div>

        {/* Simple Process Flow */}
        <div className="space-y-3">
          <h4 className="font-medium text-sm text-muted-foreground">Data Flow</h4>
          {session.dataFlow.map((flow, index) => (
            <div key={index} className="flex items-center gap-3 p-3 rounded-lg border">
              <div className="font-mono text-xs bg-muted px-2 py-1 rounded">
                {flow.from} → {flow.to}
              </div>
              <div className="flex-1">
                <div className="text-sm">{flow.summary}</div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}; 