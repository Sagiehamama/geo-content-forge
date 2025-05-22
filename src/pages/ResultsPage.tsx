import React, { useEffect, useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { FileInput, Search, Calendar, Tag, Clock, Code, Info } from 'lucide-react';
import { languages } from '@/constants/languages';
import { generateContent } from '@/services/contentGeneratorService';
import { FormData, GeneratedContent } from '@/components/content/form/types';
import ReactMarkdown from 'react-markdown';
import { getMediaSuggestions, MediaImageSpot } from '@/services/mediaAgentService';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const PLACEHOLDER_IMAGE = 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=600&q=80';

const ResultsPage = () => {
  const navigate = useNavigate();
  
  // Use useMemo to stabilize formData reference if it comes from localStorage and parsed on each render
  const formData = useMemo(() => {
    const formDataString = localStorage.getItem('contentFormData');
    return JSON.parse(formDataString || '{}') as FormData;
  }, []); // Empty dependency array means formData is memoized once on mount
  
  // Content generation state
  const [isLoading, setIsLoading] = useState(true);
  const [content, setContent] = useState<GeneratedContent | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [contentRetryCount, setContentRetryCount] = useState(0); // For retrying content generation
  
  // Media suggestions state
  const [mediaLoading, setMediaLoading] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [mediaSpots, setMediaSpots] = useState<MediaImageSpot[]>([]);
  const [selectedImages, setSelectedImages] = useState<{ [location: string]: string }>({});
  const [mediaRetryCount, setMediaRetryCount] = useState(0);
  
  useEffect(() => {
    const generateContentAsync = async () => {
      // Ensure formData is valid before proceeding
      if (!formData || !formData.prompt) {
        setError("Missing form data. Please go back and fill out the content form.");
        setIsLoading(false);
        return;
      }
      
      setIsLoading(true);
      setError(null);
      try {
        console.log(`[${new Date().toISOString()}] Frontend: Calling generateContent`);
        const generatedContent = await generateContent(formData);
        setContent(generatedContent);
      } catch (err: any) {
        console.error('Error generating content:', err);
        setError(err.message || 'An unexpected error occurred during content generation.');
      } finally {
        setIsLoading(false);
      }
    };
    
    generateContentAsync();
  }, [formData, contentRetryCount]); // Depend on memoized formData and contentRetryCount
  
  // Fetch media suggestions after content is generated
  useEffect(() => {
    if (content && content.content) {
      setMediaLoading(true);
      setMediaError(null);
      console.log(`[${new Date().toISOString()}] Frontend: Calling getMediaSuggestions`);
      getMediaSuggestions({ markdown: content.content, title: content.title })
        .then(spots => setMediaSpots(spots))
        .catch(err => setMediaError(err.message || 'Failed to get media suggestions.'))
        .finally(() => setMediaLoading(false));
    }
  }, [content, mediaRetryCount]); // content should now be stable after the first effect fix
  
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
  
  // Handler for selecting an image for a spot
  const handleSelectImage = (location: string, url: string) => {
    setSelectedImages(prev => ({ ...prev, [location]: url }));
  };
  
  // Helper to get the selected image URL or placeholder
  const getImageForSpot = (location: string) => {
    return selectedImages[location] || PLACEHOLDER_IMAGE;
  };
  
  // Handler for retrying content generation
  const handleRetryContent = () => {
    setContentRetryCount(c => c + 1);
  };
  
  // Retry handler for media agent
  const handleRetryMedia = () => setMediaRetryCount(c => c + 1);
  
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
      ) : error && !content ? ( // Important: only show this primary error/retry if content hasn't loaded at all
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
                            <ReactMarkdown>
                              {content.content}
                            </ReactMarkdown>
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
          {mediaSpots.length > 0 && (
            <div className="my-8">
              <h2 className="text-xl font-bold mb-4">Choose images for your article</h2>
              {mediaSpots.map(spot => (
                <div key={spot.location} className="mb-6">
                  <div className="mb-2 flex items-center gap-2">
                    <span className="font-medium">Image spot:</span>
                    <span className="text-muted-foreground">{spot.location.replace(/_/g, ' ')}</span>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-4 w-4 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>This is where the image will appear in your article.</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <div className="flex gap-4 flex-wrap">
                    {spot.options.map(option => (
                      <div key={option.url} className={`border rounded p-2 cursor-pointer ${selectedImages[spot.location] === option.url ? 'border-primary ring-2 ring-primary' : 'border-muted'}`} onClick={() => handleSelectImage(spot.location, option.url)} title={option.caption}>
                        <img src={option.url} alt={option.alt} className="w-32 h-20 object-cover rounded mb-2" />
                        <div className="text-xs text-muted-foreground mb-1">{option.alt}</div>
                        <div className="text-xs"><span className="underline" title={`Source: ${option.source}`}>{option.source}</span></div>
                      </div>
                    ))}
                    {/* None/Skip option */}
                    <div className={`border rounded p-2 cursor-pointer flex flex-col items-center justify-center ${!selectedImages[spot.location] ? 'border-primary ring-2 ring-primary' : 'border-muted'}`} onClick={() => handleSelectImage(spot.location, '')} title="No image (will use a nice placeholder)">
                      <img src={PLACEHOLDER_IMAGE} alt="No image" className="w-32 h-20 object-cover rounded mb-2 opacity-50" />
                      <div className="text-xs text-muted-foreground">No image</div>
                    </div>
                  </div>
                </div>
              ))}
              <div className="text-sm text-muted-foreground mt-4">Tip: Click an image to select it for each spot. You can skip any spot to use a default placeholder.</div>
            </div>
          )}
          
          {mediaSpots.length > 0 && (
            <div className="my-8">
              <h2 className="text-lg font-semibold mb-2">Preview of selected images</h2>
              {mediaSpots.map(spot => (
                <div key={spot.location} className="mb-4 flex items-center gap-4">
                  <img src={getImageForSpot(spot.location)} alt="Selected or placeholder" className="w-32 h-20 object-cover rounded" />
                  <span className="text-sm text-muted-foreground">{spot.location.replace(/_/g, ' ')}</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ResultsPage;
