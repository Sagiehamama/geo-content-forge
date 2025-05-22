import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { FormData, GeneratedContent } from '@/components/content/form/types';
import { MediaImageSpot } from '@/services/mediaAgentService';

interface ContentContextType {
  formData: FormData | null;
  setFormData: (data: FormData) => void;
  generatedContent: GeneratedContent | null;
  setGeneratedContent: (content: GeneratedContent | null) => void;
  mediaSpots: MediaImageSpot[];
  setMediaSpots: (spots: MediaImageSpot[]) => void;
  selectedImages: { [location: string]: string };
  setSelectedImages: (images: { [location: string]: string }) => void;
  clearContent: () => void;
  saveContent: () => Promise<void>;
}

const ContentContext = createContext<ContentContextType | undefined>(undefined);

export const ContentProvider = ({ children }: { children: ReactNode }) => {
  const [formData, setFormData] = useState<FormData | null>(null);
  const [generatedContent, setGeneratedContent] = useState<GeneratedContent | null>(null);
  const [mediaSpots, setMediaSpots] = useState<MediaImageSpot[]>([]);
  const [selectedImages, setSelectedImages] = useState<{ [location: string]: string }>({});

  // Initialize state from localStorage on mount
  useEffect(() => {
    const storedFormData = localStorage.getItem('contentFormData');
    const storedContent = localStorage.getItem('generatedContent');
    const storedMediaSpots = localStorage.getItem('mediaSpots');
    const storedSelectedImages = localStorage.getItem('selectedImages');

    if (storedFormData) {
      setFormData(JSON.parse(storedFormData));
    }
    if (storedContent) {
      setGeneratedContent(JSON.parse(storedContent));
    }
    if (storedMediaSpots) {
      setMediaSpots(JSON.parse(storedMediaSpots));
    }
    if (storedSelectedImages) {
      setSelectedImages(JSON.parse(storedSelectedImages));
    }
  }, []);

  // Update localStorage when state changes
  useEffect(() => {
    if (formData) {
      localStorage.setItem('contentFormData', JSON.stringify(formData));
    }
    if (generatedContent) {
      localStorage.setItem('generatedContent', JSON.stringify(generatedContent));
    }
    if (mediaSpots.length) {
      localStorage.setItem('mediaSpots', JSON.stringify(mediaSpots));
    }
    if (Object.keys(selectedImages).length) {
      localStorage.setItem('selectedImages', JSON.stringify(selectedImages));
    }
  }, [formData, generatedContent, mediaSpots, selectedImages]);

  const clearContent = () => {
    setGeneratedContent(null);
    setMediaSpots([]);
    setSelectedImages({});
    localStorage.removeItem('generatedContent');
    localStorage.removeItem('mediaSpots');
    localStorage.removeItem('selectedImages');
  };

  const saveContent = async () => {
    // TODO: Implement saving to the database
    console.log('Saving content to database...');
    // This will be implemented later
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
        selectedImages,
        setSelectedImages,
        clearContent,
        saveContent,
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