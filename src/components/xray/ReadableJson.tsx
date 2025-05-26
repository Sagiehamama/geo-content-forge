import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronRight, ExternalLink } from 'lucide-react';

interface ReadableJsonProps {
  data: any;
  className?: string;
  maxItems?: number;
}

const ReadableJson: React.FC<ReadableJsonProps> = ({ data, className = '', maxItems = 5 }) => {
  const [expandedArrays, setExpandedArrays] = useState<Set<string>>(new Set());

  const toggleArrayExpansion = (key: string) => {
    const newExpanded = new Set(expandedArrays);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedArrays(newExpanded);
  };

  const formatValue = (value: any, key?: string): React.ReactNode => {
    if (value === null) {
      return <span className="text-gray-500 italic">null</span>;
    }
    
    if (value === undefined) {
      return <span className="text-gray-500 italic">undefined</span>;
    }

    if (typeof value === 'boolean') {
      return (
        <span className={value ? 'text-green-600' : 'text-red-600'}>
          {value ? '✅ true' : '❌ false'}
        </span>
      );
    }

    if (typeof value === 'number') {
      const formatted = value.toLocaleString();
      return <span className="text-blue-600 font-medium">{formatted}</span>;
    }

    if (typeof value === 'string') {
      // Check if it's a URL
      if (value.startsWith('http://') || value.startsWith('https://')) {
        const displayUrl = value.length > 50 ? value.substring(0, 47) + '...' : value;
        return (
          <a 
            href={value} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-blue-500 hover:text-blue-700 underline inline-flex items-center gap-1"
          >
            {displayUrl} <ExternalLink className="w-3 h-3" />
          </a>
        );
      }

      // Truncate long strings
      if (value.length > 100) {
        return (
          <span className="text-green-600" title={value}>
            "{value.substring(0, 97)}..."
          </span>
        );
      }

      return <span className="text-green-600">"{value}"</span>;
    }

    if (Array.isArray(value)) {
      const arrayKey = key || 'array';
      const isExpanded = expandedArrays.has(arrayKey);
      const itemsToShow = isExpanded ? value : value.slice(0, maxItems);
      
      return (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => toggleArrayExpansion(arrayKey)}
              className="h-6 px-2 text-xs"
            >
              {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
              <Badge variant="secondary" className="ml-1">
                {value.length} items
              </Badge>
            </Button>
          </div>
          
          {itemsToShow.map((item, index) => (
            <div key={index} className="ml-4 p-2 border-l-2 border-gray-200 bg-gray-50 dark:bg-gray-800 rounded-r">
              <div className="text-xs text-gray-500 mb-1">Item {index + 1}</div>
              {formatValue(item, `${arrayKey}_${index}`)}
            </div>
          ))}
          
          {!isExpanded && value.length > maxItems && (
            <div className="ml-4 text-xs text-gray-500">
              ... and {value.length - maxItems} more items
            </div>
          )}
        </div>
      );
    }

    if (typeof value === 'object') {
      return (
        <div className="space-y-1 ml-4">
          {Object.entries(value).map(([objKey, objValue]) => (
            <div key={objKey} className="flex gap-2">
              <span className="text-gray-700 dark:text-gray-300 font-medium min-w-0">
                {objKey}:
              </span>
              <div className="flex-1 min-w-0">
                {formatValue(objValue, objKey)}
              </div>
            </div>
          ))}
        </div>
      );
    }

    return <span>{String(value)}</span>;
  };

  if (data === null || data === undefined) {
    return (
      <div className={`p-3 rounded border bg-gray-50 dark:bg-gray-900 ${className}`}>
        <span className="text-gray-500 italic">No data</span>
      </div>
    );
  }

  return (
    <div className={`p-3 rounded border bg-gray-50 dark:bg-gray-900 space-y-2 ${className}`}>
      {typeof data === 'object' && !Array.isArray(data) ? (
        Object.entries(data).map(([key, value]) => (
          <div key={key} className="flex gap-2">
            <span className="text-gray-700 dark:text-gray-300 font-medium min-w-0">
              {key}:
            </span>
            <div className="flex-1 min-w-0">
              {formatValue(value, key)}
            </div>
          </div>
        ))
      ) : (
        formatValue(data, 'root')
      )}
    </div>
  );
};

export default ReadableJson; 