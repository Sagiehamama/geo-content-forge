import React, { useEffect, useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { FileInput, Search, Calendar, Tag, Clock, Code, Info, Save } from 'lucide-react';
import { languages } from '@/constants/languages';
import { generateContent } from '@/services/contentGeneratorService';
import { FormData, GeneratedContent } from '@/components/content/form/types';
import ReactMarkdown from 'react-markdown';
import { getMediaSuggestions, MediaImageSpot } from '@/services/mediaAgentService';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useContent } from '@/context/ContentContext';
import { supabase } from '@/integrations/supabase/client';

const PLACEHOLDER_IMAGE = 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=600&q=80';

const ResultsPage = () => {
  const navigate = useNavigate();
  
  // Use the content context for state persistence
  const { 
    formData: contextFormData, 
    generatedContent: contextContent, 
    setGeneratedContent,
    mediaSpots: contextMediaSpots,
    setMediaSpots,
    selectedImages: contextSelectedImages,
    setSelectedImages,
    clearContent
  } = useContent();
  
  // Local state for UI
  const [isLoading, setIsLoading] = useState(!contextContent);
  const [error, setError] = useState<string | null>(null);
  const [contentRetryCount, setContentRetryCount] = useState(0);
  const [mediaLoading, setMediaLoading] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [mediaRetryCount, setMediaRetryCount] = useState(0);
  const [selectedSpot, setSelectedSpot] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  
  // If we don't have form data, redirect to home
  useEffect(() => {
    if (!contextFormData) {
      navigate('/');
    }
  }, [contextFormData, navigate]);
  
  // Generate content if needed
  useEffect(() => {
    const generateContentAsync = async () => {
      // Skip if we already have content
      if (contextContent) {
        setIsLoading(false);
        return;
      }
      
      // Ensure formData is valid before proceeding
      if (!contextFormData) {
        setError("Missing form data. Please go back and fill out the content form.");
        setIsLoading(false);
        return;
      }
      
      setIsLoading(true);
      setError(null);
      try {
        console.log(`[${new Date().toISOString()}] Frontend: Calling generateContent`);
        const generatedContent = await generateContent(contextFormData);
        setGeneratedContent(generatedContent);
      } catch (err: any) {
        console.error('Error generating content:', err);
        setError(err.message || 'An unexpected error occurred during content generation.');
      } finally {
        setIsLoading(false);
      }
    };
    
    generateContentAsync();
  }, [contextFormData, contextContent, contentRetryCount, setGeneratedContent]);
  
  // Fetch media suggestions if needed
  useEffect(() => {
    if (contextContent && contextContent.content && contextMediaSpots.length === 0) {
      setMediaLoading(true);
      setMediaError(null);
      console.log(`[${new Date().toISOString()}] Frontend: Calling getMediaSuggestions`);
      getMediaSuggestions({ markdown: contextContent.content, title: contextContent.title })
        .then(spots => setMediaSpots(spots))
        .catch(err => setMediaError(err.message || 'Failed to get media suggestions.'))
        .finally(() => setMediaLoading(false));
    }
  }, [contextContent, mediaRetryCount, contextMediaSpots, setMediaSpots]);
  
  const handleCopyContent = () => {
    if (contextContent) {
      navigator.clipboard.writeText(contextContent.content);
      toast.success('Content copied to clipboard');
    }
  };
  
  const handleCopyFrontmatter = () => {
    if (contextContent) {
      const yamlFrontmatter = `---
title: ${contextContent.frontmatter.title}
description: ${contextContent.frontmatter.description}
tags: [${contextContent.frontmatter.tags.join(', ')}]
slug: ${contextContent.frontmatter.slug}
author: ${contextContent.frontmatter.author}
date: ${contextContent.frontmatter.date}
${contextContent.frontmatter.featuredImage ? `featuredImage: ${contextContent.frontmatter.featuredImage}` : ''}
---`;
      
      navigator.clipboard.writeText(yamlFrontmatter);
      toast.success('YAML frontmatter copied to clipboard');
    }
  };
  
  const handleDownload = () => {
    if (contextContent) {
      // Create YAML frontmatter
      const yamlFrontmatter = `---
title: ${contextContent.frontmatter.title}
description: ${contextContent.frontmatter.description}
tags: [${contextContent.frontmatter.tags.join(', ')}]
slug: ${contextContent.frontmatter.slug}
author: ${contextContent.frontmatter.author}
date: ${contextContent.frontmatter.date}
${contextContent.frontmatter.featuredImage ? `featuredImage: ${contextContent.frontmatter.featuredImage}` : ''}
---

`;

      const fullContent = yamlFrontmatter + contextContent.content;
      const blob = new Blob([fullContent], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${contextContent.frontmatter.slug}.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Content downloaded successfully');
    }
  };
  
  const handleCreateNew = () => {
    clearContent();
    navigate('/');
  };
  
  // Save content to database
  const handleSaveContent = async () => {
    if (!contextContent || !contextFormData) return;
    
    setSaving(true);
    setSaveSuccess(false);
    
    try {
      // First, save the content request if it doesn't exist yet
      let requestId = contextFormData.id;
      
      if (!requestId) {
        const { data: requestData, error: requestError } = await supabase
          .from('content_requests')
          .insert({
            prompt: contextFormData.prompt,
            language: contextFormData.language,
            word_count: contextFormData.wordCount,
            country: contextFormData.country,
            include_frontmatter: contextFormData.includeFrontmatter,
            include_images: contextFormData.includeImages,
          })
          .select('id')
          .single();
          
        if (requestError) throw new Error(requestError.message);
        requestId = requestData.id;
      }
      
      // Then save the generated content
      const { error: contentError } = await supabase
        .from('generated_content')
        .insert({
          request_id: requestId,
          title: contextContent.title,
          content: contextContent.content,
          word_count: contextContent.wordCount,
          reading_time: contextContent.readingTime,
          frontmatter: JSON.stringify(contextContent.frontmatter),
        });
        
      if (contentError) throw new Error(contentError.message);
      
      setSaveSuccess(true);
      toast.success('Content saved to history successfully');
    } catch (error: any) {
      toast.error(`Failed to save content: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };
  
  // Handler for selecting an image for a spot
  const handleSelectImage = (location: string, url: string) => {
    setSelectedImages({ ...contextSelectedImages, [location]: url });
  };
  
  // Helper to get the selected image URL or placeholder
  const getImageForSpot = (location: string) => {
    return contextSelectedImages[location] || PLACEHOLDER_IMAGE;
  };
  
  // Handler for retrying content generation
  const handleRetryContent = () => {
    setContentRetryCount(c => c + 1);
  };
  
  // Retry handler for media agent
  const handleRetryMedia = () => setMediaRetryCount(c => c + 1);
  
  // Function to replace image placeholders in Markdown content
  const getContentWithImagePlaceholders = () => {
    if (!contextContent?.content) return '';
    
    let processedContent = contextContent.content;
    
    // First, look for explicit [IMAGE:location] tags
    contextMediaSpots.forEach(spot => {
      const locationTag = `[IMAGE:${spot.location}]`;
      if (processedContent.includes(locationTag)) {
        const imageUrl = contextSelectedImages[spot.location] || PLACEHOLDER_IMAGE;
        const replacementHtml = `![${spot.location.replace(/_/g, ' ')}](${imageUrl})`;
        processedContent = processedContent.replace(locationTag, replacementHtml);
      }
    });
    
    // Then, if no explicit tags were found, try to inject placeholders at logical spots
    if (contextMediaSpots.length > 0 && !processedContent.includes('[IMAGE:') && !processedContent.includes('![')) {
      // Try to inject after first paragraph
      if (contextMediaSpots.length > 0 && processedContent.includes('\n\n')) {
        const firstSpot = contextMediaSpots[0];
        const imageUrl = contextSelectedImages[firstSpot.location] || PLACEHOLDER_IMAGE;
        const imgMarkdown = `\n\n![${firstSpot.location.replace(/_/g, ' ')}](${imageUrl})\n\n`;
        
        // Find the first paragraph break and insert there
        const firstBreak = processedContent.indexOf('\n\n');
        if (firstBreak !== -1) {
          processedContent = 
            processedContent.substring(0, firstBreak + 2) + 
            imgMarkdown + 
            processedContent.substring(firstBreak + 2);
        }
      }
      
      // Try to inject after a section header for the second image if available
      if (contextMediaSpots.length > 1 && processedContent.includes('\n## ')) {
        const secondSpot = contextMediaSpots[1];
        const imageUrl = contextSelectedImages[secondSpot.location] || PLACEHOLDER_IMAGE;
        const imgMarkdown = `\n\n![${secondSpot.location.replace(/_/g, ' ')}](${imageUrl})\n\n`;
        
        // Find the first section header and insert after it and its text
        const sectionHeaderIdx = processedContent.indexOf('\n## ');
        if (sectionHeaderIdx !== -1) {
          const nextParagraphIdx = processedContent.indexOf('\n\n', sectionHeaderIdx + 4);
          if (nextParagraphIdx !== -1) {
            processedContent = 
              processedContent.substring(0, nextParagraphIdx + 2) + 
              imgMarkdown + 
              processedContent.substring(nextParagraphIdx + 2);
          }
        }
      }
    }
    
    return processedContent;
  };

  // Handler for clicking on an image in the preview
  const handleImageClick = (src: string) => {
    // Find which spot this image belongs to
    const spot = contextMediaSpots.find(spot => 
      contextSelectedImages[spot.location] === src || 
      (!contextSelectedImages[spot.location] && PLACEHOLDER_IMAGE === src)
    );
    
    if (spot) {
      setSelectedSpot(spot.location);
    }
  };
  
  return (
    <div className="container py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 gradient-heading">Your Generated Content</h1>
        <p className="text-muted-foreground">
          Review your AI-generated content
        </p>
      </div>
      
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
      ) : error && !contextContent ? ( // Important: only show this primary error/retry if content hasn't loaded at all
        <Card className="mb-8">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center py-12">
              <p className="text-lg font-medium text-center text-red-500">Error</p>
              <p className="text-muted-foreground mt-2 text-center mb-4">
                {error} 
              </p>
              <div className="space-y-2">
                <Button onClick={() => navigate('/')}>Return to Form</Button>
                {(error.includes('rate limit') || error.includes('429') || error.includes('OpenAI API quota')) && (
                   <Button onClick={handleRetryContent}>Try Again</Button>
                )}
                {error.includes('OpenAI API quota') && (
                  <Button variant="outline" onClick={() => window.open('https://platform.openai.com/account/billing', '_blank')}>
                    Check OpenAI Billing
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {contextContent ? (
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
                        {contextContent?.frontmatter && (
                          <TabsTrigger value="frontmatter">YAML Frontmatter</TabsTrigger>
                        )}
                      </TabsList>
                      
                      <TabsContent value="preview" className="mt-0">
                        <div className="bg-white rounded-md border p-6 prose prose-slate prose-headings:font-bold prose-headings:text-slate-900 prose-p:text-slate-700 prose-img:rounded-lg max-w-none">
                          {contextContent && (
                            <ReactMarkdown
                              components={{
                                a: ({ node, ...props }) => (
                                  <a {...props} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline" />
                                ),
                                img: ({ node, ...props }) => (
                                  <img 
                                    {...props} 
                                    className="rounded-md max-w-full h-auto my-4 cursor-pointer hover:ring-2 hover:ring-primary transition-all" 
                                    loading="lazy" 
                                    onClick={() => handleImageClick(props.src || '')}
                                  />
                                ),
                                h1: ({ node, ...props }) => (
                                  <h1 {...props} className="text-2xl font-bold mt-6 mb-4" />
                                ),
                                h2: ({ node, ...props }) => (
                                  <h2 {...props} className="text-xl font-bold mt-5 mb-3" />
                                ),
                                h3: ({ node, ...props }) => (
                                  <h3 {...props} className="text-lg font-bold mt-4 mb-2" />
                                )
                              }}
                            >
                              {getContentWithImagePlaceholders()}
                            </ReactMarkdown>
                          )}
                        </div>
                      </TabsContent>
                      
                      <TabsContent value="markdown" className="mt-0">
                        <pre className="bg-muted p-4 rounded-md overflow-auto max-h-[600px] whitespace-pre-wrap">
                          {contextContent?.content}
                        </pre>
                      </TabsContent>
                      
                      {contextContent?.frontmatter && (
                        <TabsContent value="frontmatter" className="mt-0">
                          <pre className="bg-muted p-4 rounded-md overflow-auto max-h-[600px] whitespace-pre-wrap">
{`---
title: ${contextContent.frontmatter.title}
description: ${contextContent.frontmatter.description}
tags: [${contextContent.frontmatter.tags.join(', ')}]
slug: ${contextContent.frontmatter.slug}
author: ${contextContent.frontmatter.author}
date: ${contextContent.frontmatter.date}
${contextContent.frontmatter.featuredImage ? `featuredImage: ${contextContent.frontmatter.featuredImage}` : ''}
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
                          {contextFormData?.prompt || "No prompt provided"}
                        </p>
                      </div>
                      
                      <div>
                        <p className="text-sm font-medium mb-1">Content Type</p>
                        <p className="text-sm text-muted-foreground">
                          Blog Article
                        </p>
                      </div>
                      
                      <div>
                        <p className="text-sm font-medium mb-1">Country</p>
                        <p className="text-sm text-muted-foreground">
                          {contextFormData?.country || "Not specified"}
                        </p>
                      </div>
                      
                      <div>
                        <p className="text-sm font-medium mb-1">Language</p>
                        <p className="text-sm text-muted-foreground">
                          {languages.find(l => l.code === contextFormData?.language)?.name || "English"}
                        </p>
                      </div>
                      
                      <div>
                        <p className="text-sm font-medium mb-1">Word Count</p>
                        <p className="text-sm text-muted-foreground">
                          {contextFormData?.wordCount || 1000} words
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
                    <Button className="w-full flex items-center gap-2" onClick={handleSaveContent} disabled={saving || saveSuccess}>
                      <Save className="h-4 w-4" />
                      {saving ? 'Saving...' : saveSuccess ? 'Saved' : 'Save to History'}
                    </Button>
                    <Button className="w-full" onClick={handleCopyContent}>
                      Copy Content
                    </Button>
                    {contextContent?.frontmatter && (
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
                  <p className="text-lg font-medium text-center">Error</p>
                  <p className="text-muted-foreground mt-2 text-center mb-4">
                    Failed to generate content. Please try again.
                  </p>
                  <Button onClick={() => navigate('/')}>
                    Return to Form
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
          
          {contextContent && (
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
                      <dd className="text-lg font-semibold">{contextContent?.wordCount || 0} words</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-muted-foreground">Reading Time</dt>
                      <dd className="text-lg font-semibold">{contextContent?.readingTime || 0} min</dd>
                    </div>
                  </dl>
                  <p className="text-sm text-muted-foreground mt-4 border-t pt-4">
                    Note: The reading time is calculated based on an average reading speed of 200 words per minute.
                  </p>
                </CardContent>
              </Card>
            </div>
          )}
          
          {mediaLoading && (
            <div className="flex flex-col items-center py-8">
              <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
              <p className="text-lg font-medium">Finding the best images for your article...</p>
              <p className="text-muted-foreground mt-2 text-center">This may take a few seconds. We search for relevant, high-quality images for each section.</p>
            </div>
          )}
          {mediaError && (
            <div className="text-red-600 text-center my-4">
              {mediaError.includes('rate limit') || mediaError.includes('429') ? (
                <>
                  <div>OpenAI API rate limit reached. Please wait a few seconds and try again.</div>
                  <Button onClick={handleRetryMedia} className="mt-2">Try Again</Button>
                </>
              ) : (
                <>{mediaError}</>
              )}
            </div>
          )}
        </>
      )}
      
      {contextMediaSpots.length > 0 && selectedSpot && (
        <Dialog open={!!selectedSpot} onOpenChange={() => setSelectedSpot(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Select an image</DialogTitle>
              <DialogDescription>
                Choose an image for {selectedSpot.replace(/_/g, ' ')}
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4 py-4">
              {contextMediaSpots.find(spot => spot.location === selectedSpot)?.options.map(option => (
                <div 
                  key={option.url} 
                  className={`border rounded p-2 cursor-pointer transition-all ${contextSelectedImages[selectedSpot] === option.url ? 'border-primary ring-2 ring-primary' : 'border-muted hover:border-primary'}`} 
                  onClick={() => {
                    handleSelectImage(selectedSpot, option.url);
                    setSelectedSpot(null);
                  }} 
                  title={option.caption}
                >
                  <img src={option.url} alt={option.alt} className="w-full h-32 object-cover rounded mb-2" />
                  <div className="text-xs text-muted-foreground mb-1">{option.alt}</div>
                  <div className="text-xs"><span className="underline" title={`Source: ${option.source}`}>{option.source}</span></div>
                </div>
              ))}
              {/* None/Skip option */}
              <div 
                className={`border rounded p-2 cursor-pointer flex flex-col items-center justify-center transition-all ${!contextSelectedImages[selectedSpot] ? 'border-primary ring-2 ring-primary' : 'border-muted hover:border-primary'}`} 
                onClick={() => {
                  handleSelectImage(selectedSpot, '');
                  setSelectedSpot(null);
                }} 
                title="Use placeholder image"
              >
                <img src={PLACEHOLDER_IMAGE} alt="No image" className="w-full h-32 object-cover rounded mb-2 opacity-50" />
                <div className="text-xs text-muted-foreground">Use placeholder image</div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
      
      {contextMediaSpots.length > 0 && contextContent && (
        <div className="mt-4 p-4 bg-muted rounded-md text-sm">
          <p className="font-medium">Image Selection: <span className="font-normal text-muted-foreground">Click on any image in the preview to choose from available options or use the placeholder.</span></p>
        </div>
      )}
    </div>
  );
};

export default ResultsPage;
