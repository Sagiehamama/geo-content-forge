import React, { useState } from 'react';
import { XrayMessage } from '@/services/xrayService';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Bot, User, Settings, ChevronDown, ChevronUp, Copy, Expand } from 'lucide-react';
import { toast } from 'sonner';
import ReadableJson from './ReadableJson';

interface MessageBubbleProps {
  message: XrayMessage;
  agentModel?: string; // Pass the model from the agent conversation
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message, agentModel }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const formatTime = (timestamp: number): string => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Function to detect and extract JSON content from message
  const extractJsonContent = (content: string) => {
    // Look for specific patterns that indicate JSON data
    const patterns = [
      // "Posts to analyze:" followed by JSON array
      /Posts to analyze:\s*(\[[\s\S]*?\])/,
      // Generic JSON arrays that span multiple lines and look like data
      /(\[[\s\S]{100,}?\])/,
      // JSON objects that span multiple lines
      /(\{[\s\S]{100,}?\})/
    ];
    
    for (const pattern of patterns) {
      const match = content.match(pattern);
      if (match) {
        try {
          const jsonData = JSON.parse(match[1]);
          // Only treat as JSON if it's actually structured data (array with objects or large object)
          if ((Array.isArray(jsonData) && jsonData.length > 0 && typeof jsonData[0] === 'object') ||
              (typeof jsonData === 'object' && Object.keys(jsonData).length > 3)) {
            const beforeJson = content.substring(0, match.index! + match[0].indexOf(match[1]));
            const afterJson = content.substring(match.index! + match[0].indexOf(match[1]) + match[1].length);
            return {
              hasJson: true,
              beforeJson: beforeJson.trim(),
              jsonData,
              afterJson: afterJson.trim()
            };
          }
        } catch (e) {
          // Not valid JSON, continue to next pattern
        }
      }
    }
    
    return { hasJson: false, content };
  };

  const formatModelName = (model: string): string => {
    // Format model names to be more readable and shorter
    return model
      .replace('gpt-4o-mini', 'GPT-4o Mini')
      .replace('gpt-4o', 'GPT-4o')
      .replace('gpt-4', 'GPT-4')
      .replace('gpt-3.5-turbo', 'GPT-3.5');
  };

  const getRoleConfig = (role: XrayMessage['role']) => {
    switch (role) {
      case 'system':
        return {
          icon: Settings,
          label: 'System',
          bgColor: 'bg-gray-50 dark:bg-gray-900/30',
          iconColor: 'text-gray-500',
          badgeVariant: 'secondary' as const
        };
      case 'user':
        return {
          icon: User,
          label: 'User',
          bgColor: 'bg-blue-50 dark:bg-blue-900/20',
          iconColor: 'text-blue-500',
          badgeVariant: 'default' as const
        };
      case 'assistant':
        return {
          icon: Bot,
          label: agentModel ? formatModelName(agentModel) : 'AI',
          bgColor: 'bg-green-50 dark:bg-green-900/20',
          iconColor: 'text-green-500',
          badgeVariant: 'default' as const
        };
    }
  };

  const config = getRoleConfig(message.role);
  const Icon = config.icon;
  
  // Extract JSON content if present
  const jsonContent = extractJsonContent(message.content);
  
  // Much more aggressive truncation for compact display
  const truncateLength = message.role === 'system' ? 120 : 80;
  const shouldTruncate = message.content.length > truncateLength;
  
  // Create a preview that shows just 1-2 lines
  const createPreview = (text: string) => {
    const lines = text.split('\n');
    const firstLine = lines[0]?.substring(0, truncateLength) || '';
    const secondLine = lines[1]?.substring(0, 40) || '';
    
    if (lines.length > 1 && secondLine) {
      return firstLine + '\n' + secondLine + (text.length > truncateLength ? '...' : '');
    }
    return firstLine + (text.length > truncateLength ? '...' : '');
  };

  const displayContent = shouldTruncate && !isExpanded 
    ? createPreview(message.content)
    : message.content;

  // Show expand option for messages over 100 characters or if they have JSON
  const showExpandOption = message.content.length > 100 || jsonContent.hasJson;

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      toast.success('Message copied to clipboard');
    } catch (error) {
      toast.error('Failed to copy message');
    }
  };

  return (
    <Card className={`${config.bgColor} border-l-2 border-l-current mb-2`}>
      <CardContent className="p-2">
        {/* Compact header - everything on one line */}
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            <Icon size={12} className={config.iconColor} />
            <Badge variant={config.badgeVariant} className="text-xs px-1.5 py-0.5 h-5">
              {config.label}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {formatTime(message.timestamp)}
            </span>
            {/* Show content type indicator */}
            {jsonContent.hasJson && (
              <Badge variant="outline" className="text-xs px-1 py-0 h-4">
                JSON
              </Badge>
            )}
          </div>
          
          <div className="flex items-center gap-0.5">
            {showExpandOption && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsExpanded(!isExpanded)}
                className="h-5 w-5 p-0"
                title={isExpanded ? "Collapse" : "Expand"}
              >
                {isExpanded ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={copyToClipboard}
              className="h-5 w-5 p-0"
              title="Copy to clipboard"
            >
              <Copy size={10} />
            </Button>
          </div>
        </div>
        
        {/* Content area - much more compact */}
        {jsonContent.hasJson ? (
          // Compact JSON display
          <div className="space-y-1">
            {jsonContent.beforeJson && (
              <div className="text-xs font-mono text-muted-foreground bg-background/30 px-2 py-1 rounded">
                {isExpanded ? jsonContent.beforeJson : createPreview(jsonContent.beforeJson)}
              </div>
            )}
            <div>
              {!isExpanded ? (
                // Compact JSON summary
                <div className="text-xs bg-background/30 px-2 py-1 rounded border-l-2 border-blue-200">
                  <span className="font-medium text-muted-foreground">
                    {Array.isArray(jsonContent.jsonData) 
                      ? `Array (${jsonContent.jsonData.length} items)` 
                      : `Object (${Object.keys(jsonContent.jsonData).length} keys)`
                    }
                  </span>
                  {Array.isArray(jsonContent.jsonData) && jsonContent.jsonData[0] && (
                    <span className="ml-2 text-muted-foreground">
                      {Object.keys(jsonContent.jsonData[0]).slice(0, 3).join(', ')}
                      {Object.keys(jsonContent.jsonData[0]).length > 3 ? '...' : ''}
                    </span>
                  )}
                </div>
              ) : (
                <ReadableJson 
                  data={jsonContent.jsonData} 
                  className="bg-background/30 text-xs" 
                  maxItems={50}
                />
              )}
            </div>
            {jsonContent.afterJson && (
              <div className="text-xs font-mono text-muted-foreground bg-background/30 px-2 py-1 rounded">
                {isExpanded ? jsonContent.afterJson : createPreview(jsonContent.afterJson)}
              </div>
            )}
          </div>
        ) : (
          // Regular text display - much more compact
          <div className="text-xs font-mono bg-background/30 px-2 py-1 rounded whitespace-pre-wrap">
            {displayContent}
          </div>
        )}
        
        {/* Compact expand/collapse button */}
        {showExpandOption && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="h-5 w-full mt-1 text-xs text-muted-foreground hover:text-foreground"
          >
            {isExpanded ? (
              <>
                <ChevronUp size={10} className="mr-1" />
                Show Less
              </>
            ) : (
              <>
                <ChevronDown size={10} className="mr-1" />
                {jsonContent.hasJson 
                  ? `Show ${Array.isArray(jsonContent.jsonData) ? jsonContent.jsonData.length : 'full'} ${Array.isArray(jsonContent.jsonData) ? 'items' : 'data'}`
                  : `+${message.content.length - truncateLength} chars`
                }
              </>
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}; 