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
import { getMediaSuggestions, MediaImageSpot, MediaImageOption } from '@/services/mediaAgentService';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useContent } from '@/context/ContentContext';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

// Use a path to an image in the public folder
const PLACEHOLDER_IMAGE = '/placeholder-select.png'; // Adjust filename if needed

const ResultsPage = () => {
  const navigate = useNavigate();
  
  // Use the content context for state persistence
  const { 
    formData: contextFormData, 
    generatedContent: contextContent, 
    setGeneratedContent,
    mediaSpots: contextMediaSpots,
    setMediaSpots,
    finalImages: contextFinalImages,
    updateFinalImage,
    clearContent,
    saveContent,
    isSavingContent
  } = useContent();
  
  // Local state for UI
  const [isLoading, setIsLoading] = useState(!contextContent);
  const [error, setError] = useState<string | null>(null);
  const [contentRetryCount, setContentRetryCount] = useState(0);
  const [mediaLoading, setMediaLoading] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [mediaRetryCount, setMediaRetryCount] = useState(0);
  const [selectedSpot, setSelectedSpot] = useState<string | null>(null);
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
          console.log('First spot options:', spots[0]?.options);
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
    
    setSaveSuccess(false);
    
    try {
      await saveContent();
      setSaveSuccess(true);
    } catch (err: any) {
      // Error toast is handled by saveContent in context.
      // We could add more specific error handling here if needed.
      setSaveSuccess(false);
    }
  };
  
  // Handler for selecting an image (takes full MediaImageOption or null)
  const handleSelectImage = (imageOption: MediaImageOption | null) => {
    if (!selectedSpot) return;
    
    updateFinalImage(selectedSpot, imageOption);
    
    // Close the dialog after selecting
    setTimeout(() => setSelectedSpot(null), 300);
    
    if (imageOption && imageOption.url) {
      toast.success(`Image selected for ${selectedSpot.replace(/_/g, ' ')}`);
    } else {
      toast.info(`Image removed for ${selectedSpot.replace(/_/g, ' ')}`);
    }
  };
  
  // Helper to get the selected image URL or placeholder
  const getImageForSpot = (location: string): string => {
    const finalImage = contextFinalImages.find(img => img.location === location);
    return finalImage?.url || PLACEHOLDER_IMAGE;
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
    
    // More aggressively remove "spot X" text by looking for standalone spot labels
    processedContent = processedContent.replace(/^\s*spot\s+\d+\s*$/gmi, '');
    processedContent = processedContent.replace(/\n\s*spot\s+\d+\s*\n/gi, '\n\n');
    
    // Replace with actual image markdown for better rendering
    if (contextMediaSpots.length > 0) {
      // First, convert any standalone "spot X" text to image markdown
      for (let i = 0; i < contextMediaSpots.length; i++) {
        const spotNumber = i + 1;
        const spot = contextMediaSpots[i];
        const regex = new RegExp(`\\bspot\\s*${spotNumber}\\b`, 'gi');
        
        const imageUrl = getImageForSpot(spot.location);
        const imgMarkdown = `![Image ${spotNumber}](${imageUrl})`;
        
        processedContent = processedContent.replace(regex, imgMarkdown);
      }
      
      // Look for explicit [IMAGE:location] tags and replace them
      contextMediaSpots.forEach(spot => {
        const locationTag = `[IMAGE:${spot.location}]`;
        if (processedContent.includes(locationTag)) {
          const imageUrl = getImageForSpot(spot.location);
          const altText = spot.options.find(opt => opt.url === imageUrl)?.alt || spot.location.replace(/_/g, ' ');
          const replacementHtml = `![${altText}](${imageUrl})`;
          processedContent = processedContent.replace(locationTag, replacementHtml);
        }
      });
      
      // If no images found at all, inject placeholders at logical spots
      if (!processedContent.includes('![')) {
        const paragraphs = processedContent.split('\n\n');
        
        // Try to inject after the first paragraph if we have spots
        if (contextMediaSpots.length > 0 && paragraphs.length > 1) {
          const firstSpot = contextMediaSpots[0];
          const imageUrl = getImageForSpot(firstSpot.location);
          const altText = firstSpot.options.find(opt => opt.url === imageUrl)?.alt || firstSpot.location.replace(/_/g, ' ');
          const imgMarkdown = `![${altText}](${imageUrl})`;
          
          // Insert after first paragraph
          paragraphs.splice(1, 0, imgMarkdown);
        }
        
        // Try to find a section header for the second image
        if (contextMediaSpots.length > 1 && paragraphs.length > 2) { // Ensure enough paragraphs
          // Find a section heading (## heading)
          const headingIndex = paragraphs.findIndex(p => p.startsWith('## '));
          if (headingIndex >= 0 && headingIndex + 1 < paragraphs.length) {
            const secondSpot = contextMediaSpots[1];
            const imageUrl = getImageForSpot(secondSpot.location);
            const altText = secondSpot.options.find(opt => opt.url === imageUrl)?.alt || secondSpot.location.replace(/_/g, ' ');
            const imgMarkdown = `![${altText}](${imageUrl})`;
            
            // Insert after the heading's content
            paragraphs.splice(headingIndex + 1, 0, imgMarkdown);
          }
        }
        
        // Join everything back together
        processedContent = paragraphs.join('\n\n');
      }
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
    
    // First try to match by the image src
    let matchedSpot = contextMediaSpots.find(spot => {
      const finalImage = contextFinalImages.find(img => img.location === spot.location);
      return finalImage?.url === src;
    });
    
    // If no match and it's a placeholder, try to find a matching spot from the image URL
    if (!matchedSpot) {
      // Look for spot_X pattern in the src
      const spotMatch = src.match(/spot[_\s]?(\d+)/i);
      if (spotMatch) {
        const spotNumber = spotMatch[1];
        matchedSpot = contextMediaSpots.find(s => s.location === `spot_${spotNumber}`);
      }
    }
    
    // If we found a matching spot, open the image selection dialog
    if (matchedSpot) {
      console.log(`Opening image selection dialog for spot: ${matchedSpot.location}`);
      setSelectedSpot(matchedSpot.location);
      return;
    }
    
    // If no match found yet, try to determine which image in the document was clicked
    // by index position - this is a fallback
    const images = document.querySelectorAll('.prose img');
    const clickedImageIndex = Array.from(images).findIndex(img => img.getAttribute('src') === src);
    
    if (clickedImageIndex >= 0 && clickedImageIndex < contextMediaSpots.length) {
      const spotByPosition = contextMediaSpots[clickedImageIndex];
      console.log(`Matched image by position, using spot: ${spotByPosition.location}`);
      setSelectedSpot(spotByPosition.location);
      return;
    }
    
    // If all else fails, default to the first spot
    console.log(`No matching spot found, defaulting to first spot: ${contextMediaSpots[0].location}`);
    setSelectedSpot(contextMediaSpots[0].location);
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
                                  const isPlaceholder = props.src === PLACEHOLDER_IMAGE || !props.src;
                                  
                                  // Try to find the spot this image represents.
                                  // This logic can be complex if props.src is already a final URL.
                                  let spotLocationToOpenDialogFor: string | undefined = undefined;

                                  // Attempt to find a spot whose currently selected image URL matches props.src
                                  const spotMatchingSelectedImage = contextFinalImages.find(fi => fi.url === props.src);
                                  if (spotMatchingSelectedImage) {
                                    spotLocationToOpenDialogFor = spotMatchingSelectedImage.location;
                                  } else {
                                    // Fallback: if it's a generic placeholder, or alt text hints at a spot
                                    // This part might need refinement based on how placeholders are rendered initially
                                    const spotFromAlt = contextMediaSpots.find(s => props.alt?.includes(s.location) || props.alt?.includes(s.location.replace(/_/g, ' ')));
                                    if (spotFromAlt) {
                                      spotLocationToOpenDialogFor = spotFromAlt.location;
                                    } else {
                                        // If it's a known placeholder image, try to derive spot from context
                                        // This relies on images being rendered in a somewhat predictable order initially
                                        // Or having specific alt tags from getContentWithImagePlaceholders()
                                        const imagesInPreview = Array.from(document.querySelectorAll('.prose img'));
                                        const clickedImageIndex = imagesInPreview.findIndex(img => img.getAttribute('src') === props.src);
                                        if (clickedImageIndex !== -1 && clickedImageIndex < contextMediaSpots.length) {
                                           spotLocationToOpenDialogFor = contextMediaSpots[clickedImageIndex].location;
                                        }
                                    }
                                  }
                                  
                                  const displaySrc = props.src || PLACEHOLDER_IMAGE;
                                  
                                  return (
                                    <img 
                                      {...props} 
                                      src={displaySrc}
                                      alt={props.alt || (spotLocationToOpenDialogFor ? spotLocationToOpenDialogFor.replace(/_/g, ' ') : 'Content image')}
                                      className={`rounded-md max-w-full h-auto my-4 cursor-pointer hover:ring-2 hover:ring-primary transition-all ${isPlaceholder ? 'border-2 border-dashed border-blue-300' : ''}`} 
                                      loading="lazy" 
                                      onClick={() => {
                                        if (spotLocationToOpenDialogFor) {
                                          setSelectedSpot(spotLocationToOpenDialogFor);
                                        } else if (contextMediaSpots.length > 0) {
                                          // Fallback: if no specific spot found, open for the first one.
                                          // This might happen if an image is somehow rendered without a clear spot association.
                                          setSelectedSpot(contextMediaSpots[0].location);
                                          console.warn("Could not determine specific spot for image click, defaulting to first spot.");
                                        } else {
                                          toast.info("No image spots defined for this content.");
                                        }
                                      }}
                                      style={isPlaceholder ? { 
                                        position: 'relative',
                                        borderWidth: '2px',
                                        borderStyle: 'dashed',
                                        borderColor: '#93c5fd', // A light blue, for example
                                        minHeight: '200px', // Ensure placeholder has some size
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        // Potentially add a ::before pseudo-element with text via CSS if needed, or an overlay
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
                    <Button className="w-full flex items-center gap-2" onClick={handleSaveContent} disabled={isSavingContent || saveSuccess}>
                      <Save className="h-4 w-4" />
                      {isSavingContent ? 'Saving...' : saveSuccess ? 'Saved' : 'Save to History'}
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
            <DialogTitle className="text-2xl">Select an Image</DialogTitle>
            <DialogDescription className="text-base">
              Choose an image for {selectedSpot && selectedSpot.replace(/_/g, ' ')}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-4">
            {/* Remove Image Option */}
            <Card 
              className={`overflow-hidden cursor-pointer transition-all ${
                selectedSpot && !contextFinalImages.find(fi => fi.location === selectedSpot) ? 'ring-2 ring-primary' : 'hover:shadow-md'
              }`} 
              onClick={() => handleSelectImage(null)}
            >
              <div className="p-2 flex flex-col">
                <div className="relative aspect-video rounded overflow-hidden bg-gray-50 border-2 border-dashed border-gray-300">
                  <div className="absolute inset-0 flex items-center justify-center text-gray-500">
                    <p className="text-center px-4">
                      <span className="block text-lg font-medium mb-2">No Image</span>
                      <span className="block text-sm">Remove image from this spot</span>
                    </p>
                  </div>
                </div>
                <div className="mt-2">
                  <p className="text-sm font-medium">Remove Image</p>
                  <p className="text-xs text-gray-500">Content will flow without an image</p>
                </div>
              </div>
            </Card>

            {/* Image Options */}
            {selectedSpot && (contextMediaSpots.find(s => s.location === selectedSpot)?.options || []).map((option, idx) => (
              <Card 
                key={idx} 
                className={`overflow-hidden cursor-pointer transition-all ${
                  contextFinalImages.find(fi => fi.location === selectedSpot)?.url === option.url ? 'ring-2 ring-primary' : 'hover:shadow-md'
                }`} 
                onClick={() => handleSelectImage(option)}
              >
                <div className="p-2 flex flex-col">
                  <div className="relative aspect-video rounded overflow-hidden bg-gray-100">
                    {option.url === PLACEHOLDER_IMAGE ? (
                      <div className="absolute inset-0 flex items-center justify-center text-gray-500">
                        <p className="text-center px-4">
                          <span className="block text-lg font-medium mb-2">No image available</span>
                          <span className="block text-sm">Click Refresh Images to try again</span>
                        </p>
                      </div>
                    ) : (
                      <img 
                        src={option.url} 
                        alt={option.alt || `Option ${idx + 1}`} 
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          console.error(`Failed to load image: ${option.url}`);
                          e.currentTarget.src = PLACEHOLDER_IMAGE;
                        }}
                      />
                    )}
                    {contextFinalImages.find(fi => fi.location === selectedSpot)?.url === option.url && (
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
          
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setSelectedSpot(null)}>Cancel</Button>
            <Button 
              onClick={() => handleRefreshImages()} 
              disabled={mediaLoading}
              className="min-w-[120px]"
            >
              {mediaLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Loading...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh Images
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ResultsPage;
