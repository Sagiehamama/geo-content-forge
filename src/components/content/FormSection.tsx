import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Loader2, RefreshCw } from "lucide-react";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

// Import form types and custom components
import { FormData, initialFormData } from './form/types';
import { PromptField } from './form/PromptField';
import { CompanyField } from './form/CompanyField';
import { CountryField } from './form/CountryField';
import { LanguageField } from './form/LanguageField';
import { ToneField } from './form/ToneField';
import { MediaField } from './form/MediaField';
import { WordCountField } from './form/WordCountField';
import { ContentOptionsField } from './form/ContentOptionsField';
import { useLocationDetection } from './form/useLocationDetection';
import { useContent } from '@/context/ContentContext';

const FormSection = () => {
  const { formData: contextFormData, setFormData: setContextFormData, clearContent } = useContent();
  const [localFormData, setLocalFormData] = useState<FormData>(contextFormData || initialFormData);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);
  const navigate = useNavigate();
  
  // Use the custom location detection hook
  const { isDetectingLocation } = useLocationDetection(setLocalFormData);

  // Initialize local form from context if available
  useEffect(() => {
    if (contextFormData) {
      setLocalFormData(contextFormData);
    }
  }, [contextFormData]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setLocalFormData({ ...localFormData, [name]: value });
  };

  const handleSelectChange = (name: string, value: string) => {
    setLocalFormData({ ...localFormData, [name]: value });
  };

  const handleSwitchChange = (name: string, checked: boolean) => {
    setLocalFormData({ ...localFormData, [name]: checked });
  };

  const handleToneTypeChange = (value: string) => {
    if (value === 'description' || value === 'url') {
      setLocalFormData({ ...localFormData, toneType: value });
    }
  };

  const handleSliderChange = (value: number[]) => {
    setLocalFormData({ ...localFormData, wordCount: value[0] });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setLocalFormData({ ...localFormData, mediaFile: file });
    
    if (file) {
      toast.success(`File "${file.name}" selected`);
    }
  };

  const handleClearFile = () => {
    setLocalFormData({...localFormData, mediaFile: null});
  };

  const handleMediaToggle = (mode: 'auto' | 'manual') => {
    setLocalFormData({ ...localFormData, mediaMode: mode });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(false);

    // Validate form
    if (!localFormData.prompt) {
      setError('Please enter an AI prompt to rank for');
      setIsLoading(false);
      return;
    }
    if (!localFormData.country) {
      setError('Please select a country');
      setIsLoading(false);
      return;
    }
    if (!localFormData.language) {
      setError('Please select a language');
      setIsLoading(false);
      return;
    }
    if (localFormData.toneType === 'description' && !localFormData.tone) {
      setError('Please provide a tone description');
      setIsLoading(false);
      return;
    }
    if (localFormData.toneType === 'url' && !localFormData.toneUrl) {
      setError('Please provide a reference URL for tone');
      setIsLoading(false);
      return;
    }

    try {
      // Clear any previous content
      clearContent();
      
      // Update context with new form data
      setContextFormData(localFormData);
      
      setSuccess(true);
      
      // Navigate to results page
      navigate('/results');
    } catch (error) {
      console.error('Error submitting form:', error);
      setError('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearForm = () => {
    clearContent();
    setLocalFormData(initialFormData);
    toast.success('Form cleared. Ready for new content.');
  };

  return (
    <Card className="w-full max-w-3xl mx-auto">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-2xl gradient-heading">Create Content</CardTitle>
          <CardDescription>
            Configure the parameters for your AI-generated content
          </CardDescription>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleClearForm}
          className="flex items-center gap-1"
        >
          <RefreshCw className="h-4 w-4" />
          New Content
        </Button>
      </CardHeader>
      
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-6">
          {/* AI Prompt */}
          <PromptField 
            value={localFormData.prompt} 
            onChange={handleInputChange} 
          />
          
          {/* Company Context */}
          <CompanyField 
            value={localFormData.company} 
            onChange={handleInputChange} 
          />
          
          {/* Country Dropdown */}
          <CountryField 
            value={localFormData.country}
            onChange={(value) => handleSelectChange('country', value)}
            isDetecting={isDetectingLocation}
          />
          
          {/* Language */}
          <LanguageField 
            value={localFormData.language}
            onChange={(value) => handleSelectChange('language', value)}
          />
          
          {/* Tone of Voice */}
          <ToneField 
            toneType={localFormData.toneType}
            tone={localFormData.tone}
            toneUrl={localFormData.toneUrl}
            onToneTypeChange={handleToneTypeChange}
            onInputChange={handleInputChange}
          />
          
          {/* Content Options */}
          <ContentOptionsField 
            includeFrontmatter={localFormData.includeFrontmatter}
            onSwitchChange={handleSwitchChange}
          />
          
          {/* AI Media */}
          <MediaField
            mediaMode={localFormData.mediaMode}
            mediaFile={localFormData.mediaFile}
            onToggle={handleMediaToggle}
            onFileChange={handleFileChange}
            onClearFile={handleClearFile}
          />
          
          {/* Word Count */}
          <WordCountField 
            value={localFormData.wordCount}
            onChange={handleSliderChange}
          />
        </CardContent>
        
        <CardFooter>
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <div className="flex items-center">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                <span>Processing...</span>
              </div>
            ) : "Generate Content"}
          </Button>
          {error && <div className="text-destructive text-center mt-2">{error}</div>}
          {success && <div className="text-emerald-600 text-center mt-2">Content creation started!</div>}
        </CardFooter>
      </form>
    </Card>
  );
};

export default FormSection;
