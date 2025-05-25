import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { FormData, GeneratedContent, ContentImage } from '@/components/content/form/types';
import { MediaImageSpot, MediaImageOption } from '@/services/mediaAgentService';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ContentContextType {
  formData: FormData | null;
  setFormData: (data: FormData) => void;
  generatedContent: GeneratedContent | null;
  setGeneratedContent: (content: GeneratedContent | null) => void;
  mediaSpots: MediaImageSpot[];
  setMediaSpots: (spots: MediaImageSpot[]) => void;
  finalImages: ContentImage[];
  updateFinalImage: (spotLocation: string, imageOption: MediaImageOption | null) => void;
  clearContent: () => void;
  saveContent: () => Promise<void>;
  isSavingContent: boolean;
}

const ContentContext = createContext<ContentContextType | undefined>(undefined);

export const ContentProvider = ({ children }: { children: ReactNode }) => {
  const [formData, setFormData] = useState<FormData | null>(null);
  const [generatedContent, setGeneratedContent] = useState<GeneratedContent | null>(null);
  const [mediaSpots, setMediaSpots] = useState<MediaImageSpot[]>([]);
  const [finalImages, setFinalImages] = useState<ContentImage[]>([]);
  const [isSavingContent, setIsSavingContent] = useState(false);

  // Initialize state from localStorage on mount (without files)
  useEffect(() => {
    const storedFormData = localStorage.getItem('contentFormData');
    const storedContent = localStorage.getItem('generatedContent');
    const storedMediaSpots = localStorage.getItem('mediaSpots');
    const storedFinalImages = localStorage.getItem('finalImages');

    if (storedFormData) {
      const parsedFormData = JSON.parse(storedFormData);
      // Always initialize mediaFiles as empty array since we can't store files
      parsedFormData.mediaFiles = [];
      setFormData(parsedFormData);
    }
    if (storedContent) {
      const parsedContent = JSON.parse(storedContent);
      setGeneratedContent(parsedContent);
      // If loaded content has images, populate finalImages from it initially
      if (parsedContent.images && Array.isArray(parsedContent.images)) {
        setFinalImages(parsedContent.images);
      }
    }
    if (storedMediaSpots) {
      setMediaSpots(JSON.parse(storedMediaSpots));
    }
    if (storedFinalImages) {
      setFinalImages(JSON.parse(storedFinalImages));
    }
  }, []);

  // Update localStorage when state changes (without files)
  useEffect(() => {
    if (formData) {
      const formDataToStore = { ...formData };
      // Don't store files in localStorage - just clear them
      delete (formDataToStore as any).mediaFiles;
      localStorage.setItem('contentFormData', JSON.stringify(formDataToStore));
    }
    
    // Store generatedContent along with its finalImages sub-array
    if (generatedContent) {
      const contentToStore = {
        ...generatedContent,
        images: finalImages
      };
      localStorage.setItem('generatedContent', JSON.stringify(contentToStore));
    } else {
      localStorage.removeItem('generatedContent');
    }

    if (mediaSpots.length) {
      localStorage.setItem('mediaSpots', JSON.stringify(mediaSpots));
    } else {
      localStorage.removeItem('mediaSpots');
    }

    if (finalImages.length) {
      localStorage.setItem('finalImages', JSON.stringify(finalImages));
    } else {
      localStorage.removeItem('finalImages');
    }
  }, [formData, generatedContent, mediaSpots, finalImages]);

  const updateFinalImage = (spotLocation: string, imageOption: MediaImageOption | null) => {
    setFinalImages(prevImages => {
      // If imageOption is null, remove the image for this spot
      if (!imageOption) {
        const newImages = prevImages.filter(img => img.location !== spotLocation);
        // Update generatedContent to reflect the change
        if (generatedContent) {
          setGeneratedContent({
            ...generatedContent,
            images: newImages
          });
        }
        return newImages;
      }

      const newImage: ContentImage = {
        location: spotLocation,
        url: imageOption.url,
        alt: imageOption.alt,
        caption: imageOption.caption,
        source: imageOption.source,
      };

      const existingImageIndex = prevImages.findIndex(img => img.location === spotLocation);
      let newImages;
      if (existingImageIndex >= 0) {
        newImages = [...prevImages];
        newImages[existingImageIndex] = newImage;
      } else {
        newImages = [...prevImages, newImage];
      }

      // Update generatedContent to reflect the change
      if (generatedContent) {
        setGeneratedContent({
          ...generatedContent,
          images: newImages
        });
      }

      return newImages;
    });
  };

  const clearContent = () => {
    setFormData(null);
    setGeneratedContent(null);
    setMediaSpots([]);
    setFinalImages([]);
    localStorage.removeItem('contentFormData');
    localStorage.removeItem('generatedContent');
    localStorage.removeItem('mediaSpots');
    localStorage.removeItem('finalImages');
  };

  const saveContent = async () => {
    if (!formData || !generatedContent) {
      toast.error("Form data or content is missing. Cannot save.");
      return;
    }
    setIsSavingContent(true);
    try {
      let currentRequestId = formData.id;

      // 1. Upsert content_requests
      // If formData.id exists, we assume it's from a previously saved request.
      // Otherwise, we insert a new one.
      // For simplicity, we might primarily rely on initial insert from contentGeneratorService for content_requests.
      // Let's assume formData.id might be populated if we are re-saving an already fully saved item.
      // The primary ID we need is from the initial `storeContentRequest` in `contentGeneratorService` for the `generated_content` table.
      // However, `contentGeneratorService` runs *before* image selection.

      // It seems `content_requests` is already created by `contentGeneratorService.ts` when content is first generated.
      // We need that `requestId` to associate with `generated_content`.
      // The problem is, `formData.id` is only for the *form* data, not necessarily the `content_requests` id.

      // Let's assume the `generatedContent.id` *is* the `generated_content` record ID from the initial save.
      // And `generatedContent.requestId` is the `content_requests` record ID.

      let requestId = generatedContent.id; // This 'id' in GeneratedContent might be the request_id or generated_content_id itself
                                         // From types.ts, GeneratedContent has id?: string and prompt?:string, language?: string
                                         // From contentGeneratorService, when loading history, it maps item.request_id to GeneratedContent.requestId
      
      // Let's trace `requestId` more carefully.
      // `storeContentRequest` in `contentGeneratorService.ts` does:
      // 1. Inserts into `content_requests` -> gets `requestId`.
      // 2. Inserts into `generated_content` using that `requestId`.
      // The `GeneratedContent` object returned by `generateContent` doesn't seem to carry this `requestId` directly yet.
      // This is a gap. The `GeneratedContent` object in the context needs to have the `id` of the `generated_content` record
      // and the `request_id` (foreign key to `content_requests`).

      // For now, let's assume `generatedContent.id` is the `generated_content` primary key
      // and we need a `generatedContent.requestId` for the foreign key.
      // This needs to be populated when `setGeneratedContent` is first called.
      // The `generateContent` function in service should return the created generated_content.id and content_request.id

      if (!generatedContent.id || !(generatedContent as any).requestId) {
        // This case means it's likely a fresh generation that hasn't been fully through the initial save process in contentGeneratorService,
        // or the IDs were not propagated to the context.
        // For a robust save here, we'd ideally have these IDs.
        // If not, we might have to re-insert, which is what `handleSaveContent` in ResultsPage was trying to do.

        // Fallback: if critical IDs are missing, we cannot reliably update.
        // This indicates a structural issue in how IDs are passed from initial generation to context.
        // For now, we'll proceed assuming these IDs *should* be there.
        // A proper fix would involve `generateContent` service returning these, and `setGeneratedContent` storing them.
        toast.warning("Trying to save, but critical database IDs are missing from the current content. This save might create new records or fail.");
        // For now, if generatedContent.id (PK of generated_content) is missing, we cannot update.
        // Let's log an error and prevent DB operation if essential IDs are missing.
         if (!generatedContent.id) {
            toast.error("Cannot save: Missing primary ID for generated content record.");
            setIsSavingContent(false);
            return;
        }
         if (!(generatedContent as any).requestId) {
            toast.error("Cannot save: Missing request ID for generated content record.");
            setIsSavingContent(false);
            return;
        }
      }
      
      const contentToSave: Partial<GeneratedContent> & { id: string } = {
        ...generatedContent, // has title, content, frontmatter, wordCount, readingTime
        id: generatedContent.id!, // Asserting ID exists based on above check
        images: finalImages, // The crucial part
      };

      const { error: updateError } = await supabase
        .from('generated_content')
        .update({
          title: contentToSave.title,
          content: contentToSave.content, // This should be the raw markdown
          frontmatter: typeof contentToSave.frontmatter === 'string' ? contentToSave.frontmatter : JSON.stringify(contentToSave.frontmatter),
          images: JSON.stringify(contentToSave.images), // Save the selected images
          word_count: contentToSave.wordCount,
          reading_time: contentToSave.readingTime,
          // We are not updating request_id here as it's a foreign key and set on insert.
        })
        .eq('id', contentToSave.id);

      if (updateError) {
        console.error("Error updating generated content:", updateError);
        throw new Error(`Failed to save content to database: ${updateError.message}`);
      }

      // Update the generatedContent in context to ensure it has the latest saved images
      setGeneratedContent(prev => prev ? ({...prev, images: finalImages}) : null);

      toast.success('Content and images saved successfully!');
    } catch (error: any) {
      console.error('Error in saveContent:', error);
      toast.error(error.message || 'An unexpected error occurred while saving.');
    } finally {
      setIsSavingContent(false);
    }
  };

  return (
    <ContentContext.Provider
      value={{
        formData,
        setFormData,
        generatedContent,
        setGeneratedContent,
        mediaSpots,
        setMediaSpots,
        finalImages,
        updateFinalImage,
        clearContent,
        saveContent,
        isSavingContent,
      }}
    >
      {children}
    </ContentContext.Provider>
  );
};

export const useContent = () => {
  const context = useContext(ContentContext);
  if (context === undefined) {
    throw new Error('useContent must be used within a ContentProvider');
  }
  return context;
}; 