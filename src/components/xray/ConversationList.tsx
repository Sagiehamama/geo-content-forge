import React, { useState } from 'react';
import { AgentConversation, XrayStep } from '@/services/xrayService';
import { MessageBubble } from './MessageBubble';
import ReadableJson from './ReadableJson';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, Zap, Brain, Settings, CheckCircle, AlertCircle, Loader } from 'lucide-react';

interface ConversationListProps {
  agent: AgentConversation;
}

const StepCard: React.FC<{ step: XrayStep; index: number }> = ({ step, index }) => {
  const isAIConversation = step.type === 'ai_conversation';
  
  const getStatusIcon = () => {
    switch (step.status) {
      case 'completed': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed': return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'running': return <Loader className="w-4 h-4 text-blue-500 animate-spin" />;
    }
  };

  const formatDuration = (ms: number): string => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  return (
    <Card className={`mb-4 ${isAIConversation ? 'border-l-4 border-l-blue-500' : 'border-l-4 border-l-green-500'}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isAIConversation ? <Brain className="w-4 h-4 text-blue-500" /> : <Settings className="w-4 h-4 text-green-500" />}
            <CardTitle className="text-sm font-medium">{step.name}</CardTitle>
            <Badge variant={isAIConversation ? "default" : "secondary"} className="text-xs">
              {isAIConversation ? 'AI Call' : 'Logic'}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            {getStatusIcon()}
            {step.duration && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="w-3 h-3" />
                {formatDuration(step.duration)}
              </div>
            )}
            {step.tokens && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Zap className="w-3 h-3" />
                {step.tokens}
              </div>
            )}
          </div>
        </div>
        <p className="text-xs text-muted-foreground">{step.description}</p>
      </CardHeader>
      <CardContent className="pt-0">
        {isAIConversation && step.messages ? (
          // Show AI conversation messages
          <div className="space-y-2">
            {step.messages.map((message, msgIndex) => (
              <MessageBubble key={msgIndex} message={message} agentModel={step.model} />
            ))}
            {step.model && (
              <div className="flex justify-end">
                <Badge variant="outline" className="text-xs">
                  {step.model}
                </Badge>
              </div>
            )}
          </div>
        ) : (
          // Show logical operation details
          <div className="space-y-3">
            {step.input && (
              <div>
                <h5 className="text-xs font-medium text-muted-foreground mb-1">INPUT:</h5>
                <ReadableJson data={step.input} className="bg-blue-50 dark:bg-blue-900/20" />
              </div>
            )}
            
            {step.output && (
              <div>
                <h5 className="text-xs font-medium text-muted-foreground mb-1">OUTPUT:</h5>
                {step.id === 'reddit_scraping' && step.output && typeof step.output === 'object' && 'subreddit_breakdown' in step.output ? (
                  // Special display for Reddit scraping results
                  <div className="space-y-3">
                    <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded border">
                      <div className="grid grid-cols-2 gap-4 mb-3">
                        <div className="text-center">
                          <div className="text-lg font-bold text-green-600">{(step.output as any).posts_found}</div>
                          <div className="text-xs text-muted-foreground">Posts Found</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-bold text-blue-600">{(step.output as any).subreddits_scraped}</div>
                          <div className="text-xs text-muted-foreground">Subreddits Scraped</div>
                        </div>
                      </div>
                      
                      {/* Subreddit breakdown */}
                      <div className="space-y-2">
                        <h6 className="text-xs font-medium">Subreddit Results:</h6>
                        {Object.entries((step.output as any).subreddit_breakdown).map(([subreddit, data]: [string, any]) => (
                          <div key={subreddit} className="flex items-center justify-between p-2 bg-white dark:bg-gray-800 rounded border">
                            <div className="flex items-center gap-2">
                              <Badge variant={data.posts > 0 ? "default" : "secondary"} className="text-xs">
                                r/{subreddit}
                              </Badge>
                              <span className="text-xs">{data.posts} posts</span>
                              {data.errors && (
                                <span className="text-xs text-red-500">({data.errors})</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      {/* Top posts preview */}
                      {(step.output as any).top_posts && Array.isArray((step.output as any).top_posts) && (step.output as any).top_posts.length > 0 && (
                        <div className="mt-3 space-y-2">
                          <h6 className="text-xs font-medium">Top Posts Found:</h6>
                          {(step.output as any).top_posts.slice(0, 3).map((post: any, idx: number) => (
                            <div key={idx} className="p-2 bg-white dark:bg-gray-800 rounded border">
                              <div className="text-xs font-medium mb-1">{post.title}</div>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <span>r/{post.subreddit}</span>
                                <span>•</span>
                                <span>{post.upvotes} upvotes</span>
                                <span>•</span>
                                <span>{post.comments} comments</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  // Default JSON display for other steps
                  <ReadableJson data={step.output} className="bg-green-50 dark:bg-green-900/20" />
                )}
              </div>
            )}
            
            {step.metadata && (
              <div>
                <h5 className="text-xs font-medium text-muted-foreground mb-1">METADATA:</h5>
                <ReadableJson data={step.metadata} className="bg-gray-50 dark:bg-gray-900/20" />
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export const ConversationList: React.FC<ConversationListProps> = ({ agent }) => {
  if (!agent.steps || agent.steps.length === 0) {
    // Fallback to legacy messages for backward compatibility
    if (agent.messages && agent.messages.length > 0) {
      return (
        <div className="space-y-4">
          <div className="text-sm text-muted-foreground mb-4">
            Legacy conversation format - showing messages only
          </div>
          {agent.messages.map((message, index) => (
            <MessageBubble key={index} message={message} agentModel={agent.model} />
          ))}
        </div>
      );
    }
    
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>No steps recorded for this agent</p>
      </div>
    );
  }

  // Sort steps by timestamp
  const sortedSteps = [...agent.steps].sort((a, b) => a.timestamp - b.timestamp);

  return (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground mb-4">
        {sortedSteps.length} steps executed • {sortedSteps.filter(s => s.type === 'ai_conversation').length} AI calls • {sortedSteps.filter(s => s.type === 'logical_operation').length} logical operations
      </div>
      
      {sortedSteps.map((step, index) => (
        <StepCard key={step.id || index} step={step} index={index} />
      ))}
    </div>
  );
}; 