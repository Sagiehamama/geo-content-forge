
import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { FileInput, Search, Calendar, Tag, Clock, Code } from 'lucide-react';
import { languages } from '@/constants/languages';
import { generateContent, getOpenAIApiKey, setOpenAIApiKey } from '@/services/contentGeneratorService';
import { FormData, GeneratedContent } from '@/components/content/form/types';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

const ResultsPage = () => {
  const navigate = useNavigate();
  
  // This would normally come from an API
  const formData: FormData = JSON.parse(localStorage.getItem('contentFormData') || '{}');
  
  // Content generation state
  const [isLoading, setIsLoading] = useState(true);
  const [content, setContent] = useState<GeneratedContent | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // API key configuration state
  const [showApiKeyDialog, setShowApiKeyDialog] = useState(false);
  const [apiKey, setApiKey] = useState('');
  
  useEffect(() => {
    const loadApiKey = async () => {
      const apiKeyValue = await getOpenAIApiKey();
      if (apiKeyValue) {
        setApiKey(apiKeyValue);
      }
    };

    loadApiKey();
  }, []);
  
  useEffect(() => {
    const generateContentAsync = async () => {
      try {
        // Check if we have an API key
        const apiKeyValue = await getOpenAIApiKey();
        if (!apiKeyValue) {
          setShowApiKeyDialog(true);
          setIsLoading(false);
          return;
        }
        
        // Check if we have valid form data
        if (!formData || !formData.prompt) {
          setError("Missing form data. Please go back and fill out the content form.");
          setIsLoading(false);
          return;
        }
        
        // Generate content based on form data
        const generatedContent = await generateContent(formData);
        setContent(generatedContent);
      } catch (error) {
        console.error('Error generating content:', error);
        setError('Failed to generate content: ' + (error.message || 'Unknown error'));
      } finally {
        setIsLoading(false);
      }
    };
    
    generateContentAsync();
  }, [formData]);
  
  const handleSaveApiKey = async () => {
    if (apiKey.trim()) {
      try {
        await setOpenAIApiKey(apiKey.trim());
        setShowApiKeyDialog(false);
        toast.success('API key saved successfully');
        
        // Re-trigger content generation
        setIsLoading(true);
        const generatedContent = await generateContent(formData);
        setContent(generatedContent);
        setIsLoading(false);
      } catch (error) {
        console.error('Error saving API key:', error);
        toast.error('Failed to save API key. Please try again.');
      }
    } else {
      toast.error('Please enter a valid API key');
    }
  };
  
  const handleCopyContent = () => {
    if (content) {
      navigator.clipboard.writeText(content.content);
      toast.success('Content copied to clipboard');
    }
  };
  
  const handleCopyFrontmatter = () => {
    if (content) {
      const yamlFrontmatter = `---
title: ${content.frontmatter.title}
description: ${content.frontmatter.description}
tags: [${content.frontmatter.tags.join(', ')}]
slug: ${content.frontmatter.slug}
author: ${content.frontmatter.author}
date: ${content.frontmatter.date}
${content.frontmatter.featuredImage ? `featuredImage: ${content.frontmatter.featuredImage}` : ''}
---`;
      
      navigator.clipboard.writeText(yamlFrontmatter);
      toast.success('YAML frontmatter copied to clipboard');
    }
  };
  
  const handleDownload = () => {
    if (content) {
      // Create YAML frontmatter
      const yamlFrontmatter = `---
title: ${content.frontmatter.title}
description: ${content.frontmatter.description}
tags: [${content.frontmatter.tags.join(', ')}]
slug: ${content.frontmatter.slug}
author: ${content.frontmatter.author}
date: ${content.frontmatter.date}
${content.frontmatter.featuredImage ? `featuredImage: ${content.frontmatter.featuredImage}` : ''}
---

`;

      const fullContent = yamlFrontmatter + content.content;
      const blob = new Blob([fullContent], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${content.frontmatter.slug}.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Content downloaded successfully');
    }
  };
  
  const handleCreateNew = () => {
    navigate('/');
  };
  
  return (
    <div className="container py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 gradient-heading">Your Generated Content</h1>
        <p className="text-muted-foreground">
          Review your AI-generated content
        </p>
      </div>
      
      {/* API Key Dialog */}
      <Dialog open={showApiKeyDialog} onOpenChange={setShowApiKeyDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Configure OpenAI API Key</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground mb-4">
            Please enter your OpenAI API key to generate content. This key will be stored securely in the database.
          </p>
          <Input
            type="password"
            placeholder="sk-..."
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            className="mb-4"
          />
          <DialogFooter>
            <Button onClick={handleSaveApiKey}>Save and Generate</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {isLoading ? (
        <Card className="mb-8">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
              <p className="text-lg font-medium">Generating your content...</p>
              <p className="text-muted-foreground mt-2">This may take a few minutes</p>
            </div>
          </CardContent>
        </Card>
      ) : error ? (
        <Card className="mb-8">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center py-12">
              <p className="text-lg font-medium text-center text-red-500">Error</p>
              <p className="text-muted-foreground mt-2 text-center mb-4">
                {error}
              </p>
              <Button onClick={() => navigate('/')}>
                Return to Form
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {content ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              <div className="lg:col-span-2">
                <Card className="h-full">
                  <CardHeader className="pb-3">
                    <CardTitle>Content Preview</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Tabs defaultValue="preview">
                      <TabsList className="mb-4">
                        <TabsTrigger value="preview">Preview</TabsTrigger>
                        <TabsTrigger value="markdown">Markdown</TabsTrigger>
                        {content?.frontmatter && (
                          <TabsTrigger value="frontmatter">YAML Frontmatter</TabsTrigger>
                        )}
                      </TabsList>
                      
                      <TabsContent value="preview" className="mt-0">
                        <div className="bg-white rounded-md border p-6 prose max-w-none">
                          {content && (
                            <div dangerouslySetInnerHTML={{ __html: content.content.replace(/\n/g, '<br>') }} />
                          )}
                        </div>
                      </TabsContent>
                      
                      <TabsContent value="markdown" className="mt-0">
                        <pre className="bg-muted p-4 rounded-md overflow-auto max-h-[600px] whitespace-pre-wrap">
                          {content?.content}
                        </pre>
                      </TabsContent>
                      
                      {content?.frontmatter && (
                        <TabsContent value="frontmatter" className="mt-0">
                          <pre className="bg-muted p-4 rounded-md overflow-auto max-h-[600px] whitespace-pre-wrap">
{`---
title: ${content.frontmatter.title}
description: ${content.frontmatter.description}
tags: [${content.frontmatter.tags.join(', ')}]
slug: ${content.frontmatter.slug}
author: ${content.frontmatter.author}
date: ${content.frontmatter.date}
${content.frontmatter.featuredImage ? `featuredImage: ${content.frontmatter.featuredImage}` : ''}
---`}
                          </pre>
                        </TabsContent>
                      )}
                    </Tabs>
                  </CardContent>
                </Card>
              </div>
              
              <div>
                <Card className="mb-6">
                  <CardHeader className="pb-3">
                    <CardTitle>Content Details</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <p className="text-sm font-medium mb-1">Prompt</p>
                        <p className="text-sm text-muted-foreground bg-muted p-2 rounded">
                          {formData.prompt || "No prompt provided"}
                        </p>
                      </div>
                      
                      <div>
                        <p className="text-sm font-medium mb-1">Content Type</p>
                        <p className="text-sm text-muted-foreground">
                          Blog Article
                        </p>
                      </div>
                      
                      <div>
                        <p className="text-sm font-medium mb-1">Target Audience</p>
                        <p className="text-sm text-muted-foreground">
                          {formData.audience || "General"}
                        </p>
                      </div>
                      
                      <div>
                        <p className="text-sm font-medium mb-1">Country</p>
                        <p className="text-sm text-muted-foreground">
                          {formData.country || "Not specified"}
                        </p>
                      </div>
                      
                      <div>
                        <p className="text-sm font-medium mb-1">Language</p>
                        <p className="text-sm text-muted-foreground">
                          {languages.find(l => l.code === formData.language)?.name || "English"}
                        </p>
                      </div>
                      
                      <div>
                        <p className="text-sm font-medium mb-1">Word Count</p>
                        <p className="text-sm text-muted-foreground">
                          {formData.wordCount || 1000} words
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle>Actions</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Button className="w-full" onClick={handleCopyContent}>
                      Copy Content
                    </Button>
                    {content?.frontmatter && (
                      <Button className="w-full" variant="outline" onClick={handleCopyFrontmatter}>
                        Copy Frontmatter
                      </Button>
                    )}
                    <Button className="w-full" variant="outline" onClick={handleDownload}>
                      Download as Markdown
                    </Button>
                    <Button className="w-full" variant="secondary" onClick={handleCreateNew}>
                      Create New Content
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          ) : (
            <Card className="mb-8">
              <CardContent className="pt-6">
                <div className="flex flex-col items-center justify-center py-12">
                  <p className="text-lg font-medium text-center">API Key Required</p>
                  <p className="text-muted-foreground mt-2 text-center mb-4">
                    Please configure your OpenAI API key to generate content
                  </p>
                  <Button onClick={() => setShowApiKeyDialog(true)}>
                    Configure API Key
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
          
          {content && (
            <div className="grid grid-cols-1 md:grid-cols-1 gap-6">
              <Card className="card-hover">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg">Content Statistics</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <dl className="grid grid-cols-2 gap-4">
                    <div>
                      <dt className="text-sm text-muted-foreground">Word Count</dt>
                      <dd className="text-lg font-semibold">{content?.wordCount || 0} words</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-muted-foreground">Reading Time</dt>
                      <dd className="text-lg font-semibold">{content?.readingTime || 0} min</dd>
                    </div>
                  </dl>
                  <p className="text-sm text-muted-foreground mt-4 border-t pt-4">
                    Note: The reading time is calculated based on an average reading speed of 200 words per minute.
                  </p>
                </CardContent>
              </Card>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ResultsPage;
