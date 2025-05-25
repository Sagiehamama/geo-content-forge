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
import { Input } from "@/components/ui/input";
import { ImageOption } from '@/components/content/ImageOption';
import { ResearchInsights } from '@/components/content/ResearchInsights';

// Results page component - handles content display and image selection
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
  const [useCustomDescription, setUseCustomDescription] = useState(false);
  const [customDescription, setCustomDescription] = useState('');
  const [lastCustomDescription, setLastCustomDescription] = useState('');
  
  // If we don't have form data, redirect to home
  useEffect(() => {
    if (!contextFormData) {
      navigate('/');
    }
  }, [contextFormData, navigate]);
  
  // Load last custom description from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('lastCustomDescription');
    if (saved) {
      setLastCustomDescription(saved);
      setCustomDescription(saved);
    }
  }, []);
  
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
    // Don't auto-refresh if user is doing custom search
    if (useCustomDescription) {
      console.log('Skipping auto-refresh because useCustomDescription is true');
      return;
    }
    
    if (contextContent && contextContent.content && contextMediaSpots.length === 0) {
      // Check if we're in manual mode with uploaded files
      if (contextFormData?.mediaMode === 'manual' && contextFormData?.mediaFiles && contextFormData.mediaFiles.length > 0) {
        console.log('Manual mode detected with uploaded files:', contextFormData.mediaFiles.length);
        setMediaLoading(true);
        setMediaError(null);
        
        // Convert uploaded files to media spots
        const convertFilesToMediaSpots = async () => {
          try {
            const options: MediaImageOption[] = [];
            
            // Convert all uploaded files to options
            for (let i = 0; i < contextFormData.mediaFiles.length; i++) {
              const file = contextFormData.mediaFiles[i];
              
              // Create object URL for the file to display it
              const imageUrl = URL.createObjectURL(file);
              
              options.push({
                url: imageUrl,
                alt: file.name.replace(/\.[^/.]+$/, ""), // Remove file extension for alt text
                caption: `User uploaded: ${file.name}`,
                source: 'User Upload'
              });
            }
            
            // CRITICAL FIX: Parse semantic markers from content to determine spot count
            const semanticMarkers = contextContent.content.match(/\[IMAGE:([^\]]+)\]/g) || [];
            const spotsNeeded = semanticMarkers.length;
            
            console.log(`Manual mode: Found ${semanticMarkers.length} semantic markers in content`);
            console.log('Semantic markers:', semanticMarkers);
            
            // Create spots to match the semantic markers in the content
            const spots: MediaImageSpot[] = [];
            
            for (let i = 0; i < spotsNeeded; i++) {
              spots.push({
                location: `spot_${i + 1}`,
                options: [...options] // Each spot gets all uploaded images as options
              });
            }
            
            console.log('Created media spots from uploaded files:', spots);
            console.log(`Created ${spots.length} spots to match ${spotsNeeded} semantic markers, each with ${options.length} options`);
            setMediaSpots(spots);
          } catch (err) {
            console.error('Error converting files to media spots:', err);
            setMediaError('Failed to process uploaded files');
          } finally {
            setMediaLoading(false);
          }
        };
        
        convertFilesToMediaSpots();
        return;
      }
      
      // Otherwise, proceed with automatic media suggestions
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
                location: 'spot_1',
                options: [{
                  url: PLACEHOLDER_IMAGE,
                  alt: 'Default image placeholder',
                  caption: 'Image placeholder',
                  source: 'System'
                }]
              }
            ];
            console.log('Created default media spot since none were found');
          } else {
            // Ensure automated spots use standardized naming for consistency
            spots = spots.map((spot, index) => ({
              ...spot,
              location: `spot_${index + 1}` // Standardize to spot_1, spot_2, spot_3
            }));
            console.log('Standardized automated spot locations:', spots.map(s => s.location));
          }
          setMediaSpots(spots);
        })
        .catch(err => {
          console.error('Error getting media suggestions:', err);
          setMediaError(err.message || 'Failed to get media suggestions.');
        })
        .finally(() => setMediaLoading(false));
    }
  }, [contextContent, mediaRetryCount, contextMediaSpots, setMediaSpots, useCustomDescription, contextFormData]);
  
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
    console.log('handleSelectImage called with:', { selectedSpot, imageOption });
    
    if (!selectedSpot) {
      console.log('No selectedSpot, returning early');
      return;
    }
    
    console.log('Calling updateFinalImage with:', selectedSpot, imageOption);
    updateFinalImage(selectedSpot, imageOption);
    
    console.log('Current finalImages after update:', contextFinalImages);
    
    // Close the dialog after selecting
    setTimeout(() => setSelectedSpot(null), 300);
    
    if (imageOption && imageOption.url) {
      toast.success(`Image selected for ${selectedSpot.replace(/_/g, ' ')}`);
      console.log(`Image selected for ${selectedSpot}`);
    } else {
      toast.info(`Image removed for ${selectedSpot.replace(/_/g, ' ')}`);
      console.log(`Image removed for ${selectedSpot}`);
    }
  };
  
  // Helper to get the selected image URL or placeholder
  const getImageForSpot = (location: string): string => {
    const finalImage = contextFinalImages.find(img => img.location === location);
    const imageUrl = finalImage?.url || PLACEHOLDER_IMAGE;
    console.log(`getImageForSpot(${location}): finalImage =`, finalImage, 'returning:', imageUrl);
    return imageUrl;
  };
  
  // Handler for retrying content generation
  const handleRetryContent = () => {
    setContentRetryCount(c => c + 1);
  };
  
  // Handler for refreshing images
  const handleRefreshImages = async (customDescription?: string) => {
    setMediaSpots([]); // Clear existing spots first
    setMediaRetryCount(prev => prev + 1);
    setMediaLoading(true);
    setMediaError(null);
    
    try {
      // If we have a custom description, pass it to the media agent
      if (customDescription && contextContent) {
        const spots = await getMediaSuggestions({
          markdown: contextContent.content,
          title: contextContent.title,
          customDescription
        });
        console.log('Custom search results:', spots);
        setMediaSpots(spots);
      } else if (contextContent) {
        const spots = await getMediaSuggestions({
          markdown: contextContent.content,
          title: contextContent.title
        });
        setMediaSpots(spots);
      }
      
      toast.success('Image suggestions refreshed');
    } catch (err: any) {
      console.error('Error refreshing images:', err);
      setMediaError(err.message || 'Failed to refresh images');
      toast.error('Failed to refresh images');
    } finally {
      setMediaLoading(false);
    }
  };
  
  // Handler for button click
  const handleRefreshClick = async () => {
    await handleRefreshImages();
  };
  
  // Handler for custom description search
  const handleCustomSearch = async () => {
    console.log('Handling custom search with description:', customDescription);
    if (customDescription.trim()) {
      // Save to localStorage
      localStorage.setItem('lastCustomDescription', customDescription);
      setLastCustomDescription(customDescription);
      
      // Trigger search
      console.log('Calling getMediaSuggestions with custom description');
      await handleRefreshImages(customDescription);
      
      // DON'T reset UI - keep useCustomDescription true so user knows they're using custom search
      // setUseCustomDescription(false);
      // console.log('Reset useCustomDescription to false');
    }
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
    
    console.log('=== MARKDOWN GENERATION DEBUG ===');
    console.log('Initial processed content (first 200 chars):', processedContent.substring(0, 200));
    console.log('Media spots:', contextMediaSpots);
    console.log('Final images:', contextFinalImages);
    
    // PHASE 1: Check for semantic [IMAGE:description] markers first
    const semanticMarkers = processedContent.match(/\[IMAGE:([^\]]+)\]/g);
    
    if (semanticMarkers && semanticMarkers.length > 0) {
      console.log('=== SEMANTIC MARKERS FOUND ===');
      console.log('Found semantic markers:', semanticMarkers);
      
      // Process semantic markers with proper spot mapping
      semanticMarkers.forEach((marker, index) => {
        const spotLocation = `spot_${index + 1}`;
        const imageDescription = marker.match(/\[IMAGE:([^\]]+)\]/)?.[1] || '';
        
        console.log(`Processing semantic marker ${index + 1}: ${marker} -> ${spotLocation}`);
        
        // Find corresponding image for this spot
        const finalImage = contextFinalImages.find(img => img.location === spotLocation);
        
        let replacement;
        if (finalImage) {
          // Use selected image
          replacement = `![${finalImage.alt}](${finalImage.url})`;
          console.log(`Replacing ${marker} with selected image: ${replacement}`);
        } else {
          // Use placeholder with spot-specific fragment for click tracking
          replacement = `![${imageDescription}](${PLACEHOLDER_IMAGE}#${spotLocation})`;
          console.log(`Replacing ${marker} with placeholder: ${replacement}`);
        }
        
        // Replace the semantic marker with image markdown
        processedContent = processedContent.replace(marker, replacement);
      });
      
      console.log('=== SEMANTIC PROCESSING COMPLETE ===');
    } else {
      console.log('=== NO SEMANTIC MARKERS - USING MATHEMATICAL POSITIONING ===');
      
      // PHASE 2: Fall back to mathematical positioning for legacy content
      if (contextMediaSpots.length > 0) {
        // First, convert any standalone "spot X" text to image markdown
        for (let i = 0; i < contextMediaSpots.length; i++) {
          const spotNumber = i + 1;
          const spot = contextMediaSpots[i];
          const regex = new RegExp(`\\bspot\\s*${spotNumber}\\b`, 'gi');
          
          const imageUrl = getImageForSpot(spot.location);
          const imgMarkdown = `![Image ${spotNumber}](${imageUrl})`;
          
          console.log(`Processing spot ${spotNumber}: regex=${regex}, imageUrl=${imageUrl}`);
          processedContent = processedContent.replace(regex, imgMarkdown);
        }
        
        // Look for explicit [IMAGE:location] tags and replace them
        contextMediaSpots.forEach(spot => {
          const locationTag = `[IMAGE:${spot.location}]`;
          if (processedContent.includes(locationTag)) {
            const imageUrl = getImageForSpot(spot.location);
            const altText = spot.options.find(opt => opt.url === imageUrl)?.alt || spot.location.replace(/_/g, ' ');
            const replacementHtml = `![${altText}](${imageUrl})`;
            console.log(`Replacing ${locationTag} with ${replacementHtml}`);
            processedContent = processedContent.replace(locationTag, replacementHtml);
          }
        });
        
        // If no images found at all, inject placeholders at logical spots
        // But each placeholder should be specifically tied to a spot
        if (!processedContent.includes('![')) {
          console.log('No images found in content, injecting placeholders with specific spot markers');
          const paragraphs = processedContent.split('\n\n');
          const totalParagraphs = paragraphs.length;
          
          // Calculate optimal image positions based on content length
          const imagePositions = contextMediaSpots.map((_, idx) => {
            // Distribute images evenly throughout the content
            return Math.floor((totalParagraphs / (contextMediaSpots.length + 1)) * (idx + 1));
          });
          
          console.log('Image positions calculated:', imagePositions);
          
          // Insert spot-specific placeholders at calculated positions
          imagePositions.forEach((position, idx) => {
            if (position < paragraphs.length) {
              const spot = contextMediaSpots[idx];
              
              // Check if this spot has a selected image
              const finalImage = contextFinalImages.find(img => img.location === spot.location);
              
              let imgMarkdown;
              if (finalImage) {
                // Use the selected image
                imgMarkdown = `![${finalImage.alt}](${finalImage.url})`;
                console.log(`Inserting selected image at position ${position}: ${imgMarkdown}`);
              } else {
                // Use placeholder with spot-specific ID so we can track clicks
                imgMarkdown = `![${spot.location.replace(/_/g, ' ')}](${PLACEHOLDER_IMAGE}#${spot.location})`;
                console.log(`Inserting placeholder at position ${position}: ${imgMarkdown}`);
              }
              
              // Insert after the paragraph at the calculated position
              paragraphs.splice(position, 0, imgMarkdown);
            }
          });
          
          // Join everything back together
          processedContent = paragraphs.join('\n\n');
        }
      }
    }
    
    console.log('Final processed content (first 500 chars):', processedContent.substring(0, 500));
    
    // Also show content around image insertions for debugging
    const imageMarkdownPattern = /!\[.*?\]\(.*?\)/g;
    const imageMatches = Array.from(processedContent.matchAll(imageMarkdownPattern));
    console.log('Found image markdown in final content:', imageMatches.map(match => match[0]));
    
    // Show content around first image insertion
    if (imageMatches.length > 0) {
      const firstImageIndex = imageMatches[0].index || 0;
      const start = Math.max(0, firstImageIndex - 100);
      const end = Math.min(processedContent.length, firstImageIndex + 200);
      console.log('Content around first image insertion:', processedContent.substring(start, end));
    }
    
    console.log('=== END MARKDOWN DEBUG ===');
    
    return processedContent;
  };

  // Handler for clicking on an image in the preview
  const handleImageClick = (src: string) => {
    // If no media spots, nothing to do
    if (contextMediaSpots.length === 0) {
      console.log('No media spots available for image selection');
      return;
    }
    
    console.log(`Image clicked with src: ${src.substring(0, 50)}...`);
    console.log('Available media spots:', contextMediaSpots.map(s => s.location));
    
    // Check if the URL has a spot fragment (e.g., "/placeholder-select.png#spot_1")
    if (src.includes('#')) {
      const spotId = src.split('#')[1];
      const matchedSpot = contextMediaSpots.find(s => s.location === spotId);
      if (matchedSpot) {
        console.log(`Found spot from URL fragment: ${spotId}`);
        setSelectedSpot(spotId);
        return;
      }
    }
    
    // First try to match by the image src (for already selected images)
    let matchedSpot = contextMediaSpots.find(spot => {
      const finalImage = contextFinalImages.find(img => img.location === spot.location);
      return finalImage?.url === src;
    });
    
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
      
      {mediaLoading && (
        <div className="flex flex-col items-center py-4 mb-8 bg-white rounded-lg border shadow-sm">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-lg font-medium">Finding the best images for your article...</p>
          <p className="text-muted-foreground mt-2 text-center">This may take a few seconds. We search for relevant, high-quality images for each section.</p>
        </div>
      )}

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
                              key={`content-${contextFinalImages.length}-${contextFinalImages.map(img => img.location).join('-')}`}
                              urlTransform={(uri) => {
                                // Critical: Allow blob URLs to pass through without sanitization
                                console.log('🔍 urlTransform called with:', uri);
                                if (uri.startsWith('blob:') || uri.startsWith('data:')) {
                                  console.log('✅ Allowing blob/data URL:', uri);
                                  return uri;
                                }
                                if (uri.startsWith('http:') || uri.startsWith('https:')) {
                                  console.log('✅ Allowing HTTP URL:', uri);
                                  return uri;
                                }
                                console.log('✅ Allowing other URL:', uri);
                                return uri;
                              }}
                              components={{
                                a: ({ node, ...props }) => (
                                  <a {...props} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline" />
                                ),
                                img: ({ node, ...props }) => {
                                  console.log('=== IMG COMPONENT DEBUG ===');
                                  console.log('props.src:', props.src);
                                  console.log('props.alt:', props.alt);
                                  
                                  // Determine if this is a placeholder image (handle fragment URLs)
                                  const srcWithoutFragment = props.src?.split('#')[0];
                                  const isPlaceholder = srcWithoutFragment === PLACEHOLDER_IMAGE || !props.src;
                                  
                                  console.log('srcWithoutFragment:', srcWithoutFragment);
                                  console.log('PLACEHOLDER_IMAGE:', PLACEHOLDER_IMAGE);
                                  console.log('isPlaceholder:', isPlaceholder);
                                  
                                  // Check if it's a blob URL
                                  const isBlobUrl = props.src?.startsWith('blob:');
                                  console.log('isBlobUrl:', isBlobUrl);
                                  
                                  if (isBlobUrl) {
                                    console.log('🔍 BLOB URL DETECTED:', props.src);
                                    // Test if blob URL is still valid
                                    fetch(props.src)
                                      .then(response => {
                                        console.log('✅ Blob URL fetch success:', response.status, response.ok);
                                        return response.blob();
                                      })
                                      .then(blob => {
                                        console.log('✅ Blob content:', blob.size, 'bytes', blob.type);
                                      })
                                      .catch(error => {
                                        console.error('❌ Blob URL fetch failed:', error);
                                      });
                                  }

                                  // Try to find the spot this image represents.
                                  // This logic can be complex if props.src is already a final URL.
                                  let spotLocationToOpenDialogFor: string | undefined = undefined;

                                  // Check if the URL has a spot fragment (e.g., "/placeholder-select.png#spot_1")
                                  if (props.src?.includes('#')) {
                                    const spotId = props.src.split('#')[1];
                                    const matchedSpot = contextMediaSpots.find(s => s.location === spotId);
                                    if (matchedSpot) {
                                      spotLocationToOpenDialogFor = spotId;
                                    }
                                  } else {
                                    // Attempt to find a spot whose currently selected image URL matches props.src
                                    const spotMatchingSelectedImage = contextFinalImages.find(fi => fi.url === props.src);
                                    if (spotMatchingSelectedImage) {
                                      spotLocationToOpenDialogFor = spotMatchingSelectedImage.location;
                                    } else {
                                      // Fallback: if it's a generic placeholder, or alt text hints at a spot
                                      const spotFromAlt = contextMediaSpots.find(s => props.alt?.includes(s.location) || props.alt?.includes(s.location.replace(/_/g, ' ')));
                                      if (spotFromAlt) {
                                        spotLocationToOpenDialogFor = spotFromAlt.location;
                                      } else {
                                        // If it's a known placeholder image, try to derive spot from context
                                        const imagesInPreview = Array.from(document.querySelectorAll('.prose img'));
                                        const clickedImageIndex = imagesInPreview.findIndex(img => img.getAttribute('src') === props.src);
                                        if (clickedImageIndex !== -1 && clickedImageIndex < contextMediaSpots.length) {
                                           spotLocationToOpenDialogFor = contextMediaSpots[clickedImageIndex].location;
                                        }
                                      }
                                    }
                                  }
                                  
                                  const displaySrc = props.src || PLACEHOLDER_IMAGE;
                                  console.log('Final displaySrc:', displaySrc);
                                  console.log('=== END IMG COMPONENT DEBUG ===');
                                  
                                  return (
                                    <img 
                                      {...props} 
                                      src={displaySrc}
                                      alt={props.alt || (spotLocationToOpenDialogFor ? spotLocationToOpenDialogFor.replace(/_/g, ' ') : 'Content image')}
                                      className={`rounded-md max-w-full h-auto my-4 cursor-pointer hover:ring-2 hover:ring-primary transition-all ${isPlaceholder ? 'border-2 border-dashed border-blue-300' : ''}`} 
                                      loading="lazy" 
                                      onLoad={() => {
                                        if (isBlobUrl) {
                                          console.log('✅ Blob image loaded successfully:', props.src);
                                        }
                                      }}
                                      onError={(e) => {
                                        console.error('❌ Image failed to load:', props.src);
                                        console.error('Error event:', e);
                                        if (isBlobUrl) {
                                          console.error('❌ BLOB URL FAILED TO LOAD');
                                        }
                                      }}
                                      onClick={() => {
                                        if (spotLocationToOpenDialogFor) {
                                          setSelectedSpot(spotLocationToOpenDialogFor);
                                        } else if (contextMediaSpots.length > 0) {
                                          // Fallback: if no specific spot found, open for the first one.
                                          setSelectedSpot(contextMediaSpots[0].location);
                                          console.warn("Could not determine specific spot for image click, defaulting to first spot.");
                                        } else {
                                          toast.info("No image spots defined for this content.");
                                        }
                                      }}
                                      style={isPlaceholder ? { 
                                        borderWidth: '2px',
                                        borderStyle: 'dashed',
                                        borderColor: '#93c5fd',
                                        minHeight: '100px',
                                        maxHeight: '150px',
                                        width: '50%',
                                        margin: '0 auto',
                                        display: 'block',
                                        objectFit: 'cover',
                                        backgroundColor: '#f8fafc'
                                      } : {
                                        maxWidth: '100%',
                                        height: 'auto',
                                        display: 'block'
                                      }}
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
                      
                      {contextFormData?.company && (
                        <div>
                          <p className="text-sm font-medium mb-1">Company/Brand Context</p>
                          <p className="text-sm text-muted-foreground bg-muted p-2 rounded">
                            {contextFormData.company}
                          </p>
                        </div>
                      )}
                      
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
                
                {/* Research Insights */}
                {contextContent?.researchInsights && contextContent.researchInsights.length > 0 && (
                  <div className="mb-6">
                    <ResearchInsights insights={contextContent.researchInsights} />
                  </div>
                )}
                
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
          
          {mediaError && (
            <div className="text-red-600 text-center my-4">
              {mediaError.includes('rate limit') || mediaError.includes('429') ? (
                <>
                  <div>OpenAI API rate limit reached. Please wait a few seconds and try again.</div>
                  <Button onClick={handleRefreshClick} className="mt-2">Try Again</Button>
                </>
              ) : (
                <>{mediaError}</>
              )}
            </div>
          )}
        </>
      )}
      
      {/* Image Selection Dialog */}
      <Dialog open={!!selectedSpot} onOpenChange={(open) => {
        if (!open) {
          setSelectedSpot(null);
          setUseCustomDescription(false);
        }
      }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">Select an Image</DialogTitle>
            <DialogDescription className="text-base">
              Choose an image for {selectedSpot && selectedSpot.replace(/_/g, ' ')}
            </DialogDescription>
          </DialogHeader>

          {/* Action buttons at the top for better UX */}
          <div className="flex items-center gap-2 py-2 border-b">
            <Button 
              variant={!useCustomDescription ? "default" : "outline"}
              size="sm"
              onClick={() => setUseCustomDescription(false)}
            >
              AI Suggestions
            </Button>
            <Button 
              variant={useCustomDescription ? "default" : "outline"}
              size="sm"
              onClick={() => setUseCustomDescription(true)}
            >
              Custom Search
            </Button>
            {!useCustomDescription && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleRefreshClick}
                disabled={mediaLoading}
              >
                {mediaLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Loading...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                  </>
                )}
              </Button>
            )}
          </div>

          {/* Custom search input - appears right after clicking Custom Search */}
          {useCustomDescription && (
            <div className="space-y-3">
              <div className="flex gap-2">
                <Input
                  placeholder="Describe the image you want (e.g., 'professional swimwear photoshoot on beach')"
                  value={customDescription}
                  onChange={(e) => setCustomDescription(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && customDescription.trim()) {
                      handleCustomSearch();
                    }
                  }}
                  className="flex-1"
                />
                <Button
                  onClick={handleCustomSearch}
                  disabled={mediaLoading || !customDescription.trim()}
                >
                  {mediaLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Searching...
                    </>
                  ) : (
                    'Search'
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Image results */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 my-4">
            {selectedSpot && contextMediaSpots.map(spot => {
              if (spot.location !== selectedSpot) return null;
              return spot.options.map((option, idx) => (
                <ImageOption
                  key={`${spot.location}-${idx}`}
                  option={option}
                  onSelect={() => handleSelectImage(option)}
                />
              ));
            })}
            <ImageOption
              option={null}
              onSelect={() => handleSelectImage(null)}
            />
          </div>

          <DialogFooter className="flex items-center justify-end pt-4 border-t">
            <Button onClick={() => setSelectedSpot(null)} variant="outline">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ResultsPage;

