import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, TrendingUp, MessageSquare, Info, Search } from "lucide-react";
import { ResearchInsight } from "@/components/content/form/types";

interface ResearchInsightsProps {
  insights: ResearchInsight[];
  researchStatus?: {
    enabled: boolean;
    insightsFound: boolean;
    noInsightsReason?: string;
  };
}

export const ResearchInsights: React.FC<ResearchInsightsProps> = ({ insights, researchStatus }) => {
  // Show "no insights" card if research was enabled but no insights found
  if (researchStatus?.enabled && !researchStatus.insightsFound && researchStatus.noInsightsReason) {
    return (
      <Card className="border-orange-200 bg-orange-50/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-orange-800">
            <Search className="h-5 w-5" />
            Reddit Research Results
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-white rounded-lg p-4 border border-orange-100">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-orange-500 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-medium text-orange-900 mb-2">
                  No Valuable Insights Found
                </h4>
                <p className="text-orange-700 text-sm mb-3">
                  {researchStatus.noInsightsReason}
                </p>
                <p className="text-orange-600 text-xs">
                  Content was generated using your original prompt without Reddit insights.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  // Don't show anything if research wasn't enabled or no insights
  if (!insights || insights.length === 0) {
    return null;
  }

  return (
    <Card className="border-blue-200 bg-blue-50/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-blue-800">
          <TrendingUp className="h-5 w-5" />
          Reddit Research Insights ({insights.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {insights.map((insight) => (
          <div key={insight.id} className="bg-white rounded-lg p-4 border border-blue-100">
            <div className="flex justify-between items-start mb-2">
              <Badge 
                variant="secondary" 
                className={`text-xs ${
                  insight.relevanceScore >= 9 ? 'bg-green-100 text-green-800' :
                  insight.relevanceScore >= 7 ? 'bg-yellow-100 text-yellow-800' :
                  'bg-gray-100 text-gray-800'
                }`}
              >
                Relevance: {insight.relevanceScore}/10
              </Badge>
              <a
                href={insight.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 flex items-center gap-1 text-sm"
              >
                <ExternalLink className="h-3 w-3" />
                {insight.source}
              </a>
            </div>
            
            <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-blue-500" />
              {insight.postTitle}
            </h4>
            
            <p className="text-gray-700 text-sm mb-3">
              {insight.insight}
            </p>
            
            {insight.keywords && insight.keywords.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {insight.keywords.map((keyword, index) => (
                  <Badge key={index} variant="outline" className="text-xs bg-blue-50">
                    {keyword}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}; 