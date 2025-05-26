import React, { useState } from 'react';
import { XrayMessage } from '@/services/xrayService';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Bot, User, Settings, ChevronDown, ChevronUp, Copy, Expand } from 'lucide-react';
import { toast } from 'sonner';

interface MessageBubbleProps {
  message: XrayMessage;
  agentModel?: string; // Pass the model from the agent conversation
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message, agentModel }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const formatTime = (timestamp: number): string => {
    return new Date(timestamp).toLocaleTimeString();
  };

  const formatModelName = (model: string): string => {
    // Format model names to be more readable
    return model
      .replace('gpt-4o-mini', 'GPT-4o Mini')
      .replace('gpt-4o', 'GPT-4o')
      .replace('gpt-4', 'GPT-4')
      .replace('gpt-3.5-turbo', 'GPT-3.5 Turbo');
  };

  const getRoleConfig = (role: XrayMessage['role']) => {
    switch (role) {
      case 'system':
        return {
          icon: Settings,
          label: 'System Prompt',
          bgColor: 'bg-gray-100 dark:bg-gray-800',
          iconColor: 'text-gray-600 dark:text-gray-400',
          badgeVariant: 'secondary' as const
        };
      case 'user':
        return {
          icon: User,
          label: 'User Input',
          bgColor: 'bg-blue-50 dark:bg-blue-900/20',
          iconColor: 'text-blue-600 dark:text-blue-400',
          badgeVariant: 'default' as const
        };
      case 'assistant':
        return {
          icon: Bot,
          label: agentModel ? `AI Engine (${formatModelName(agentModel)})` : 'AI Engine Response',
          bgColor: 'bg-green-50 dark:bg-green-900/20',
          iconColor: 'text-green-600 dark:text-green-400',
          badgeVariant: 'default' as const
        };
    }
  };

  const config = getRoleConfig(message.role);
  const Icon = config.icon;
  
  // Show first 200 characters for regular messages, 300 for system prompts
  const truncateLength = message.role === 'system' ? 300 : 200;
  const shouldTruncate = message.content.length > truncateLength;
  const displayContent = shouldTruncate && !isExpanded 
    ? message.content.slice(0, truncateLength) + '...'
    : message.content;

  // Always show expand option for system prompts or messages over 100 characters
  const showExpandOption = message.role === 'system' || message.content.length > 100;

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      toast.success('Message copied to clipboard');
    } catch (error) {
      toast.error('Failed to copy message');
    }
  };

  return (
    <Card className={`${config.bgColor} border-l-4 border-l-current`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <Icon size={16} className={config.iconColor} />
            <Badge variant={config.badgeVariant} className="text-xs">
              {config.label}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {formatTime(message.timestamp)}
            </span>
          </div>
          
          <div className="flex items-center gap-1">
            {showExpandOption && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsExpanded(!isExpanded)}
                className="h-6 w-6 p-0"
                title={isExpanded ? "Collapse" : "Expand"}
              >
                {isExpanded ? <ChevronUp size={12} /> : <Expand size={12} />}
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={copyToClipboard}
              className="h-6 w-6 p-0"
              title="Copy to clipboard"
            >
              <Copy size={12} />
            </Button>
          </div>
        </div>
        
        <div className="space-y-3">
          <div className="whitespace-pre-wrap text-sm font-mono bg-background/50 p-3 rounded border">
            {displayContent}
          </div>
          
          {shouldTruncate && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center gap-1 text-xs"
            >
              {isExpanded ? (
                <>
                  <ChevronUp size={12} />
                  Show Less
                </>
              ) : (
                <>
                  <ChevronDown size={12} />
                  Show More ({message.content.length - truncateLength} more characters)
                </>
              )}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}; 