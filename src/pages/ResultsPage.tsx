import React, { useEffect, useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { FileInput, Search, Calendar, Tag, Clock, Code, Info, Save, Check, RefreshCw, FileText, Sparkles } from 'lucide-react';
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
import { XrayService, AgentConversation } from '@/services/xrayService';

// Results page component - handles content display and image selection
// Use a path to an image in the public folder
const PLACEHOLDER_IMAGE = '/placeholder-select.png'; // Adjust filename if needed

// Empty State Component
const EmptyState = ({ onCreateNew }: { onCreateNew: () => void }) => (
  <div className="flex flex-col items-center justify-center py-16 px-4">
    <div className="max-w-md text-center">
      <div className="mb-6">
        <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
          <FileText className="h-8 w-8 text-muted-foreground" />
        </div>
        <h2 className="text-2xl font-semibold text-gray-900 mb-2">No Content Yet</h2>
        <p className="text-muted-foreground">
          It looks like you haven't generated any content yet. Create your first AI-powered article to get started.
        </p>
      </div>
      
      <div className="space-y-3">
        <Button onClick={onCreateNew} className="w-full">
          <Sparkles className="h-4 w-4 mr-2" />
          Create New Content
        </Button>
        <Button variant="outline" onClick={() => window.location.href = '/history'} className="w-full">
          <Clock className="h-4 w-4 mr-2" />
          View History
        </Button>
      </div>
      
      <div className="mt-8 text-sm text-muted-foreground">
        <p>💡 Tip: Use the research agent to discover insights from Reddit communities and create more engaging content.</p>
      </div>
    </div>
  </div>
);

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
  
  // If we don't have form data, show empty state instead of redirect
  const showEmptyState = !contextFormData && !contextContent && !isLoading;
  
  // Only redirect if we're loading and have no data
  useEffect(() => {
    // Don't redirect immediately - let the empty state handle it
    // This allows users to see the empty state if they navigate directly to /results
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
    
    // Check if we need to fetch media suggestions
    // We need them if: no spots exist OR spots exist but have no real image options (only placeholders)
    const needsMediaSuggestions = contextMediaSpots.length === 0 || 
      contextMediaSpots.every(spot => 
        !spot.options || 
        spot.options.length === 0 || 
        spot.options.every(option => 
          option.url === PLACEHOLDER_IMAGE || 
          option.url === '/placeholder-select.png' ||
          option.url.startsWith('data:image/svg+xml;base64,') ||
          option.source === 'System (Error loading Unsplash images)'
        )
      );
    
    // Removed verbose debug logging
    
    if (contextContent && contextContent.content && needsMediaSuggestions) {
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
      
      // 🎯 XRAY: Get current session ID if exists
      const currentSession = XrayService.getCurrentSession();
      const xraySessionId = currentSession?.contentId;
      
      getMediaSuggestions({ 
        markdown: contextContent.content, 
        title: contextContent.title,
        xraySessionId: xraySessionId
      })
        .then(result => {
          console.log('Media suggestions received:', result);
          
          // 🎯 XRAY: Capture Media Agent conversations if available
          if (result.conversations?.media_agent && xraySessionId) {
            try {
                          const mediaConversation: AgentConversation = {
              agentName: 'media_agent',
              order: 3, // After research and content agents
              steps: result.conversations.media_agent.steps || [{
                id: 'media_analysis_fallback',
                type: 'ai_conversation',
                name: 'Media Analysis (Legacy)',
                description: 'AI analyzes content to identify optimal image placement locations',
                timestamp: Date.now(),
                duration: result.conversations.media_agent.timing?.duration || 0,
                status: 'completed',
                messages: result.conversations.media_agent.messages,
                model: result.conversations.media_agent.model,
                tokens: result.conversations.media_agent.tokens
              }],
              messages: result.conversations.media_agent.messages,
              timing: result.conversations.media_agent.timing,
              tokens: result.conversations.media_agent.tokens,
              model: result.conversations.media_agent.model
            };
              
              XrayService.logConversation(xraySessionId, mediaConversation);
              
              // Log data flow from content generator to media agent
              XrayService.logDataFlow(xraySessionId, {
                from: 'content_generator',
                to: 'media_agent',
                data: { 
                  markdownContent: contextContent.content.substring(0, 200) + '...',
                  contentTitle: contextContent.title
                },
                summary: `Media Agent analyzed generated markdown content to identify optimal image placement locations`
              });
              
              console.log('✅ XRAY: Media Agent conversation captured');
            } catch (xrayError) {
              console.error('❌ XRAY: Failed to capture media conversation:', xrayError);
              // Don't fail media loading if XRAY capture fails
            }
          }
          
          let spots = result.images;
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
    return finalImage?.url || PLACEHOLDER_IMAGE;
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
    
    // If this is a custom search, clear previously selected images
    if (customDescription) {
      // Clear all previously selected images by setting each spot to null
      contextFinalImages.forEach(img => {
        updateFinalImage(img.location, null);
      });
      console.log('🔄 Custom search: Cleared previously selected images');
    }
    
    try {
      // 🎯 XRAY: Get current session ID if exists
      const currentSession = XrayService.getCurrentSession();
      const xraySessionId = currentSession?.contentId;
      
      // If we have a custom description, pass it to the media agent
      if (customDescription && contextContent) {
        console.log('📤 SENDING TO MEDIA AGENT:', { customDescription, title: contextContent.title });
        const result = await getMediaSuggestions({
          markdown: contextContent.content,
          title: contextContent.title,
          customDescription,
          xraySessionId: xraySessionId,
          isRefresh: true
        });
        console.log('✅ CUSTOM SEARCH RESULTS:', result.images?.length, 'spots with', result.images?.[0]?.options?.length, 'options each');
        console.log('🖼️ FIRST SPOT IMAGES:', result.images?.[0]?.options?.map(opt => ({ url: opt.url.substring(0, 60), alt: opt.alt })));
        
        // 🎯 XRAY: Capture Media Agent conversations if available
        if (result.conversations?.media_agent && xraySessionId) {
          try {
            const mediaConversation: AgentConversation = {
              agentName: 'media_agent',
              order: 3,
              steps: result.conversations.media_agent.steps || [{
                id: 'media_analysis_fallback',
                type: 'ai_conversation',
                name: 'Media Analysis (Legacy)',
                description: 'AI analyzes content to identify optimal image placement locations',
                timestamp: Date.now(),
                duration: result.conversations.media_agent.timing?.duration || 0,
                status: 'completed',
                messages: result.conversations.media_agent.messages,
                model: result.conversations.media_agent.model,
                tokens: result.conversations.media_agent.tokens
              }],
              messages: result.conversations.media_agent.messages,
              timing: result.conversations.media_agent.timing,
              tokens: result.conversations.media_agent.tokens,
              model: result.conversations.media_agent.model
            };
            
            XrayService.logConversation(xraySessionId, mediaConversation);
            console.log('✅ XRAY: Media Agent custom search conversation captured');
          } catch (xrayError) {
            console.error('❌ XRAY: Failed to capture media conversation:', xrayError);
          }
        }
        
        setMediaSpots(result.images);
        console.log('✅ Media spots updated after custom search');
      } else if (contextContent) {
        const result = await getMediaSuggestions({
          markdown: contextContent.content,
          title: contextContent.title,
          xraySessionId: xraySessionId,
          isRefresh: true
        });
        
        // 🎯 XRAY: Capture Media Agent conversations if available
        if (result.conversations?.media_agent && xraySessionId) {
          try {
            const mediaConversation: AgentConversation = {
              agentName: 'media_agent',
              order: 3,
              steps: result.conversations.media_agent.steps || [{
                id: 'media_analysis_fallback',
                type: 'ai_conversation',
                name: 'Media Analysis (Legacy)',
                description: 'AI analyzes content to identify optimal image placement locations',
                timestamp: Date.now(),
                duration: result.conversations.media_agent.timing?.duration || 0,
                status: 'completed',
                messages: result.conversations.media_agent.messages,
                model: result.conversations.media_agent.model,
                tokens: result.conversations.media_agent.tokens
              }],
              messages: result.conversations.media_agent.messages,
              timing: result.conversations.media_agent.timing,
              tokens: result.conversations.media_agent.tokens,
              model: result.conversations.media_agent.model
            };
            
            XrayService.logConversation(xraySessionId, mediaConversation);
            console.log('✅ XRAY: Media Agent refresh conversation captured');
          } catch (xrayError) {
            console.error('❌ XRAY: Failed to capture media conversation:', xrayError);
          }
        }
        
        setMediaSpots(result.images);
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
    // If we're in a dialog for a specific spot, refresh just that spot
    if (selectedSpot) {
      console.log(`🔄 Refreshing images for specific spot: ${selectedSpot}`);
      await handleRefreshImages();
      // The dialog will automatically update because contextMediaSpots will change
    } else {
      // Otherwise refresh all spots
      console.log('🔄 Refreshing all image spots');
      await handleRefreshImages();
    }
  };
  
  // Handler for custom description search
  const handleCustomSearch = async () => {
    if (customDescription.trim()) {
      console.log('🔍 CUSTOM SEARCH:', customDescription);
      localStorage.setItem('lastCustomDescription', customDescription);
      setLastCustomDescription(customDescription);
      await handleRefreshImages(customDescription);
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
    
    // Removed verbose markdown debug logging
    
    // PHASE 1: Check for semantic [IMAGE:description] markers first
    const semanticMarkers = processedContent.match(/\[IMAGE:([^\]]+)\]/g);
    
    if (semanticMarkers && semanticMarkers.length > 0) {
      console.log('✅ SEMANTIC MARKERS:', semanticMarkers.length);
      
      // Process semantic markers with proper spot mapping
      semanticMarkers.forEach((marker, index) => {
        const spotLocation = `spot_${index + 1}`;
        const imageDescription = marker.match(/\[IMAGE:([^\]]+)\]/)?.[1] || '';
        
        // Find corresponding image for this spot
        const finalImage = contextFinalImages.find(img => img.location === spotLocation);
        
        let replacement;
        if (finalImage) {
          // Use selected image
          replacement = `![${finalImage.alt}](${finalImage.url})`;
        } else {
          // Use placeholder with spot-specific fragment for click tracking
          replacement = `![${imageDescription}](${PLACEHOLDER_IMAGE}#${spotLocation})`;
        }
        
        // Replace the semantic marker with image markdown
        processedContent = processedContent.replace(marker, replacement);
      });
      
    } else {
      console.log('⚠️ NO SEMANTIC MARKERS - using fallback positioning');
      
      // PHASE 2: Fall back to mathematical positioning for legacy content
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
          const totalParagraphs = paragraphs.length;
          
          // Special handling for hero image (first spot)
          if (contextMediaSpots.length > 0) {
            const heroSpot = contextMediaSpots[0];
            const heroFinalImage = contextFinalImages.find(img => img.location === heroSpot.location);
            
            let heroImgMarkdown;
            if (heroFinalImage) {
              heroImgMarkdown = `![${heroFinalImage.alt}](${heroFinalImage.url})`;
            } else {
              heroImgMarkdown = `![Hero image for article](${PLACEHOLDER_IMAGE}#${heroSpot.location})`;
            }
            
            // Insert hero image right after the title (first paragraph is usually the title)
            if (paragraphs.length > 1) {
              paragraphs.splice(1, 0, heroImgMarkdown);
            } else {
              paragraphs.unshift(heroImgMarkdown);
            }
          }
          
          // Handle remaining spots (skip first spot since it's the hero)
          const remainingSpots = contextMediaSpots.slice(1);
          if (remainingSpots.length > 0) {
            // Calculate positions for remaining images (distribute through content)
            const imagePositions = remainingSpots.map((_, idx) => {
              // Start from position 3 (after title and hero image) and distribute evenly
              const startPosition = 3;
              const availablePositions = Math.max(1, paragraphs.length - startPosition);
              return startPosition + Math.floor((availablePositions / (remainingSpots.length + 1)) * (idx + 1));
            });
            
            // Insert remaining images at calculated positions (in reverse order to maintain positions)
            imagePositions.reverse().forEach((position, reverseIdx) => {
              const idx = remainingSpots.length - 1 - reverseIdx;
              const spot = remainingSpots[idx];
              
              if (position < paragraphs.length) {
                // Check if this spot has a selected image
                const finalImage = contextFinalImages.find(img => img.location === spot.location);
                
                let imgMarkdown;
                if (finalImage) {
                  // Use the selected image
                  imgMarkdown = `![${finalImage.alt}](${finalImage.url})`;
                } else {
                  // Use placeholder with spot-specific ID so we can track clicks
                  imgMarkdown = `![${spot.location.replace(/_/g, ' ')}](${PLACEHOLDER_IMAGE}#${spot.location})`;
                }
                
                // Insert at the calculated position
                paragraphs.splice(position, 0, imgMarkdown);
              }
            });
          }
          
          // Join everything back together
          processedContent = paragraphs.join('\n\n');
        }
      }
    }
    
    // Removed verbose final content logging
    
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
    const matchedSpot = contextMediaSpots.find(spot => {
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

      {showEmptyState ? (
        <EmptyState onCreateNew={handleCreateNew} />
      ) : isLoading ? (
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
                                                                              return uri;
                              }}
                              components={{
                                a: ({ node, ...props }) => (
                                  <a {...props} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline" />
                                ),
                                img: ({ node, ...props }) => {
                                  // Determine if this is a placeholder image (handle fragment URLs)
                                  const srcWithoutFragment = props.src?.split('#')[0];
                                  const isPlaceholder = srcWithoutFragment === PLACEHOLDER_IMAGE || !props.src;
                                  const isBlobUrl = props.src?.startsWith('blob:');

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
                                  
                                  return (
                                    <img 
                                      {...props} 
                                      src={displaySrc}
                                      alt={props.alt || (spotLocationToOpenDialogFor ? spotLocationToOpenDialogFor.replace(/_/g, ' ') : 'Content image')}
                                      className={`rounded-md max-w-full h-auto my-4 cursor-pointer hover:ring-2 hover:ring-primary transition-all ${isPlaceholder ? 'border-2 border-dashed border-blue-300' : ''}`} 
                                      loading="lazy" 
                                      onError={(e) => {
                                        console.error('❌ Image failed to load:', props.src);
                                      }}
                                      onClick={() => {
                                        if (spotLocationToOpenDialogFor) {
                                          setSelectedSpot(spotLocationToOpenDialogFor);
                                        } else if (contextMediaSpots.length > 0) {
                                          // Fallback: if no specific spot found, open for the first one.
                                          setSelectedSpot(contextMediaSpots[0].location);
                                        } else {
                                          toast.info("No image spots defined for this content.");
                                        }
                                      }}
                                      style={isPlaceholder ? { 
                                        borderWidth: '2px',
                                        borderStyle: 'dashed',
                                        borderColor: '#93c5fd',
                                        minHeight: '200px',
                                        maxHeight: '300px',
                                        width: '100%',
                                        maxWidth: '600px',
                                        margin: '16px auto',
                                        display: 'block',
                                        objectFit: 'contain',
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
            <EmptyState onCreateNew={handleCreateNew} />
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
        <DialogContent key={`dialog-${selectedSpot}-${JSON.stringify(contextMediaSpots.map(s => s.options?.map(o => o.url.substring(0, 30)) || []))}`} className="max-w-3xl max-h-[90vh] overflow-y-auto">
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
            {mediaLoading ? (
              <div className="col-span-full text-center py-8">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
                <p className="text-muted-foreground">Loading new image suggestions...</p>
              </div>
            ) : selectedSpot && (() => {
              const currentSpot = contextMediaSpots.find(spot => spot.location === selectedSpot);
              console.log(`🖼️ Dialog showing images for spot: ${selectedSpot}`, {
                spotFound: !!currentSpot,
                optionsCount: currentSpot?.options?.length || 0,
                totalSpots: contextMediaSpots.length,
                firstOptionUrl: currentSpot?.options?.[0]?.url,
                allOptions: currentSpot?.options?.map(opt => ({ url: opt.url.substring(0, 50), alt: opt.alt })),
                dialogKey: `dialog-${selectedSpot}-${JSON.stringify(contextMediaSpots.map(s => s.options?.map(o => o.url.substring(0, 30)) || []))}`
              });
              
              if (!currentSpot) {
                return (
                  <div className="col-span-full text-center py-8 text-muted-foreground">
                    <p>No images available for this spot.</p>
                    <p className="text-sm mt-2">Try refreshing to get new suggestions.</p>
                  </div>
                );
              }
              
              return currentSpot.options.map((option, idx) => (
                <ImageOption
                  key={`${currentSpot.location}-${idx}-${option.url}`}
                  option={option}
                  onSelect={() => handleSelectImage(option)}
                />
              ));
            })()}
            {!mediaLoading && (
              <ImageOption
                option={null}
                onSelect={() => handleSelectImage(null)}
              />
            )}
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

