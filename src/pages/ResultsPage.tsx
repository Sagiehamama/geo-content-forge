import React, { useEffect, useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { FileInput, Search, Calendar, Tag, Clock, Code, Info, Save, Check, RefreshCw } from 'lucide-react';
import { languages } from '@/constants/languages';
import { generateContent } from '@/services/contentGeneratorService';
import { FormData, GeneratedContent } from '@/components/content/form/types';
import ReactMarkdown from 'react-markdown';
import { getMediaSuggestions, MediaImageSpot } from '@/services/mediaAgentService';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useContent } from '@/context/ContentContext';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

// Replace the placeholder with a more obvious placeholder image that's more visually prominent
const PLACEHOLDER_IMAGE = 'data:image/svg+xml;charset=UTF-8,%3Csvg%20width%3D%22600%22%20height%3D%22400%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Crect%20width%3D%22600%22%20height%3D%22400%22%20fill%3D%22%23e0e0e0%22%2F%3E%3Crect%20x%3D%2250%22%20y%3D%2250%22%20width%3D%22500%22%20height%3D%22300%22%20fill%3D%22%23f0f0f0%22%20stroke%3D%22%2385c1e9%22%20stroke-width%3D%224%22%20stroke-dasharray%3D%225%2C5%22%2F%3E%3Ctext%20x%3D%22300%22%20y%3D%22180%22%20font-family%3D%22Arial%2C%20sans-serif%22%20font-size%3D%2224%22%20font-weight%3D%22bold%22%20text-anchor%3D%22middle%22%20fill%3D%22%234a90e2%22%3EClick%20to%20select%20image%3C%2Ftext%3E%3Ctext%20x%3D%22300%22%20y%3D%22220%22%20font-family%3D%22Arial%2C%20sans-serif%22%20font-size%3D%2218%22%20text-anchor%3D%22middle%22%20fill%3D%22%236b7280%22%3EChoose%20from%20available%20options%3C%2Ftext%3E%3C%2Fsvg%3E';

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
        
        // Clean up the content before storing it
        if (generatedContent.content) {
          // Strip out any code blocks that might contain YAML
          let cleanContent = generatedContent.content;
          if (cleanContent.startsWith('```yaml') || cleanContent.startsWith('```yml')) {
            const codeBlockEnd = cleanContent.indexOf('```', 3);
            if (codeBlockEnd !== -1) {
              cleanContent = cleanContent.substring(codeBlockEnd + 3).trim();
            }
          }
          
          // Also strip out any YAML frontmatter that's in the content
          if (cleanContent.startsWith('---')) {
            const frontmatterEndIndex = cleanContent.indexOf('---', 3);
            if (frontmatterEndIndex > 0) {
              cleanContent = cleanContent.substring(frontmatterEndIndex + 3).trim();
            }
          }
          
          generatedContent.content = cleanContent;
        }
        
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
        .then(spots => {
          console.log('Media spots received:', spots);
          if (spots.length === 0) {
            // Create a default spot if none were found
            spots = [
              {
                location: 'default_spot',
                options: [{
                  url: PLACEHOLDER_IMAGE,
                  alt: 'Default image placeholder',
                  caption: 'Image placeholder',
                  source: 'System'
                }]
              }
            ];
            console.log('Created default media spot since none were found');
          }
          setMediaSpots(spots);
        })
        .catch(err => {
          console.error('Error getting media suggestions:', err);
          setMediaError(err.message || 'Failed to get media suggestions.');
        })
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
  
  // Handler for selecting an image
  const handleSelectImage = (url: string) => {
    if (!selectedSpot) return;
    
    // Update the selected image for this spot
    setSelectedImages({
      ...contextSelectedImages,
      [selectedSpot]: url
    });
    
    // Close the dialog after selecting
    setTimeout(() => setSelectedSpot(null), 300);
    
    toast.success(`Image selected for ${selectedSpot.replace(/_/g, ' ')}`);
  };
  
  // Helper to get the selected image URL or placeholder
  const getImageForSpot = (location: string) => {
    return contextSelectedImages[location] || PLACEHOLDER_IMAGE;
  };
  
  // Handler for retrying content generation
  const handleRetryContent = () => {
    setContentRetryCount(c => c + 1);
  };
  
  // Handler for refreshing images
  const handleRefreshImages = () => {
    setMediaRetryCount(prev => prev + 1);
    toast.info('Refreshing image suggestions...');
  };
  
  // Function to replace image placeholders in Markdown content
  const getContentWithImagePlaceholders = () => {
    if (!contextContent?.content) return '';
    
    // Aggressively strip out any YAML frontmatter from the beginning
    let processedContent = contextContent.content;
    if (processedContent.startsWith('---')) {
      const frontmatterEndIndex = processedContent.indexOf('---', 3);
      if (frontmatterEndIndex > 0) {
        // Extract everything after the closing --- of the frontmatter
        processedContent = processedContent.substring(frontmatterEndIndex + 3).trim();
      }
    }
    
    // Clean up any "spot X" text that might be appearing
    processedContent = processedContent.replace(/\bspot\s+\d+\b/gi, '');
    
    // Clean up any standalone line breaks that might be causing layout issues
    processedContent = processedContent.replace(/\n{3,}/g, '\n\n');
    
    // First, look for explicit [IMAGE:location] tags and replace them
    contextMediaSpots.forEach(spot => {
      const locationTag = `[IMAGE:${spot.location}]`;
      if (processedContent.includes(locationTag)) {
        const imageUrl = contextSelectedImages[spot.location] || PLACEHOLDER_IMAGE;
        const replacementHtml = `![${spot.location.replace(/_/g, ' ')}](${imageUrl})`;
        processedContent = processedContent.replace(locationTag, replacementHtml);
      }
    });
    
    // If no explicit tags were found, inject placeholders at logical spots
    if (contextMediaSpots.length > 0 && !processedContent.includes('[IMAGE:') && !processedContent.match(/!\[.*?\]\(.*?\)/)) {
      const paragraphs = processedContent.split('\n\n');
      
      // Try to inject after the first paragraph if we have spots
      if (contextMediaSpots.length > 0 && paragraphs.length > 1) {
        const firstSpot = contextMediaSpots[0];
        const imageUrl = contextSelectedImages[firstSpot.location] || PLACEHOLDER_IMAGE;
        const imgMarkdown = `![${firstSpot.location.replace(/_/g, ' ')}](${imageUrl})`;
        
        // Insert after first paragraph
        paragraphs.splice(1, 0, imgMarkdown);
      }
      
      // Try to find a section header for the second image
      if (contextMediaSpots.length > 1) {
        // Find a section heading (## heading)
        const headingIndex = paragraphs.findIndex(p => p.startsWith('## '));
        if (headingIndex >= 0 && headingIndex + 1 < paragraphs.length) {
          const secondSpot = contextMediaSpots[1];
          const imageUrl = contextSelectedImages[secondSpot.location] || PLACEHOLDER_IMAGE;
          const imgMarkdown = `![${secondSpot.location.replace(/_/g, ' ')}](${imageUrl})`;
          
          // Insert after the heading's content
          paragraphs.splice(headingIndex + 1, 0, imgMarkdown);
        }
      }
      
      // Join everything back together
      processedContent = paragraphs.join('\n\n');
    }
    
    return processedContent;
  };

  // Handler for clicking on an image in the preview
  const handleImageClick = (src: string) => {
    // If no media spots, nothing to do
    if (contextMediaSpots.length === 0) {
      console.log('No media spots available for image selection');
      return;
    }
    
    console.log(`Image clicked with src: ${src.substring(0, 30)}...`);
    console.log('Available media spots:', contextMediaSpots.map(s => s.location));
    
    // Find which spot this image belongs to based on the src
    const spot = contextMediaSpots.find(spot => {
      // Case 1: It's a selected image for this spot
      if (contextSelectedImages[spot.location] === src) {
        return true;
      }
      
      // Case 2: It's a placeholder and this spot doesn't have a selected image
      if (src === PLACEHOLDER_IMAGE && !contextSelectedImages[spot.location]) {
        return true;
      }
      
      return false;
    });
    
    // If we found a matching spot, open the image selection dialog
    if (spot) {
      console.log(`Opening image selection dialog for spot: ${spot.location}`);
      setSelectedSpot(spot.location);
    } else {
      // If no specific match but we have spots, default to the first one
      console.log(`No matching spot found, defaulting to first spot: ${contextMediaSpots[0].location}`);
      setSelectedSpot(contextMediaSpots[0].location);
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
                                img: ({ node, ...props }) => {
                                  // Determine if this is a placeholder image
                                  const isPlaceholder = props.src === PLACEHOLDER_IMAGE;
                                  // Find which spot this might belong to
                                  const spotLocation = contextMediaSpots.find(spot => 
                                    contextSelectedImages[spot.location] === props.src || 
                                    (!contextSelectedImages[spot.location] && isPlaceholder)
                                  )?.location;
                                  
                                  // Return only the img element without wrapping div to avoid nesting issues
                                  return (
                                    <img 
                                      {...props} 
                                      className={`rounded-md max-w-full h-auto my-4 cursor-pointer hover:ring-2 hover:ring-primary transition-all ${isPlaceholder ? 'border-2 border-dashed border-blue-300' : ''}`} 
                                      loading="lazy" 
                                      onClick={() => handleImageClick(props.src || '')}
                                      style={isPlaceholder ? { 
                                        position: 'relative',
                                        borderWidth: '2px',
                                        borderStyle: 'dashed',
                                        borderColor: '#93c5fd'
                                      } : undefined}
                                      title={isPlaceholder ? "Click to select an image" : props.alt}
                                    />
                                  );
                                },
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
                  <Button onClick={handleRefreshImages} className="mt-2">Try Again</Button>
                </>
              ) : (
                <>{mediaError}</>
              )}
            </div>
          )}
        </>
      )}
      
      {/* Image Selection Dialog */}
      <Dialog open={!!selectedSpot} onOpenChange={(open) => !open && setSelectedSpot(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">Select an Image</DialogTitle>
            <DialogDescription>
              Choose an image for {selectedSpot && selectedSpot.replace(/_/g, ' ')}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-4">
            {selectedSpot && (contextMediaSpots.find(s => s.location === selectedSpot)?.options || []).map((option, idx) => (
              <Card key={idx} className={`overflow-hidden cursor-pointer transition-all ${
                contextSelectedImages[selectedSpot] === option.url ? 'ring-2 ring-primary' : 'hover:shadow-md'
              }`} onClick={() => handleSelectImage(option.url)}>
                <div className="p-2 flex flex-col">
                  <div className="relative aspect-video rounded overflow-hidden">
                    <img 
                      src={option.url} 
                      alt={option.alt || `Option ${idx + 1}`} 
                      className="w-full h-full object-cover"
                    />
                    {contextSelectedImages[selectedSpot] === option.url && (
                      <div className="absolute top-2 right-2 bg-primary text-white p-1 rounded-full">
                        <Check className="h-4 w-4" />
                      </div>
                    )}
                  </div>
                  <div className="mt-2">
                    <p className="text-sm font-medium truncate">{option.caption || `Option ${idx + 1}`}</p>
                    <p className="text-xs text-gray-500">{option.source || 'Source: Unknown'}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedSpot(null)}>Cancel</Button>
            <Button onClick={() => handleRefreshImages()}>
              {mediaLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
              Refresh Images
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ResultsPage;
