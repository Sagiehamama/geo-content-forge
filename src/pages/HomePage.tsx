
import React from 'react';
import FormSection from '@/components/content/FormSection';
import MultiAgentDiagram from '@/components/content/MultiAgentDiagram';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Bot, Search, FileSearch, BarChart4, RefreshCcw } from 'lucide-react';

const HomePage = () => {
  return (
    <div className="container py-8">
      <div className="max-w-4xl mx-auto mb-12 text-center">
        <h1 className="text-4xl md:text-5xl font-bold mb-4 gradient-heading">
          AI-Powered Content Creation
        </h1>
        <p className="text-xl text-muted-foreground">
          Use multi agents to generate high quality, GEO-optimized content
        </p>
      </div>
      
      {/* Form section now comes first */}
      <div className="mb-12">
        <FormSection />
      </div>
      
      {/* Combined agent diagram and description section */}
      <div className="mb-12">
        <MultiAgentDiagram />
        
        <Card className="mt-8">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Bot className="h-6 w-6 text-primary" />
              <CardTitle>Content Generator Agent</CardTitle>
            </div>
            <CardDescription>
              Our advanced Content Generator Agent creates high-quality, original content by intelligently combining real-time web search with AI-powered insights
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Search className="h-4 w-4 text-primary" />
                  <p className="font-medium">Real-time Web Research</p>
                </div>
                <p className="text-sm text-muted-foreground pl-6">
                  Gathers up-to-date information from trusted sources across the web
                </p>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <FileSearch className="h-4 w-4 text-primary" />
                  <p className="font-medium">Original Insights</p>
                </div>
                <p className="text-sm text-muted-foreground pl-6">
                  Creates unique perspectives by analyzing trends and identifying novel angles
                </p>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <BarChart4 className="h-4 w-4 text-primary" />
                  <p className="font-medium">SEO Optimization</p>
                </div>
                <p className="text-sm text-muted-foreground pl-6">
                  Structures content for maximum search engine visibility and engagement
                </p>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <RefreshCcw className="h-4 w-4 text-primary" />
                  <p className="font-medium">Multiple LLM Chains</p>
                </div>
                <p className="text-sm text-muted-foreground pl-6">
                  Uses specialized AI models for outlining, research, and editorialization
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default HomePage;
