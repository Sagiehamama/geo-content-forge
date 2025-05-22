
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Loader2 } from "lucide-react";
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
import { CountryField } from './form/CountryField';
import { LanguageField } from './form/LanguageField';
import { ToneField } from './form/ToneField';
import { MediaField } from './form/MediaField';
import { WordCountField } from './form/WordCountField';
import { useLocationDetection } from './form/useLocationDetection';

const FormSection = () => {
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  
  // Use the custom location detection hook
  const { isDetectingLocation } = useLocationDetection(setFormData);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData({ ...formData, [name]: value });
  };

  const handleSwitchChange = (name: string, checked: boolean) => {
    setFormData({ ...formData, [name]: checked });
  };

  const handleToneTypeChange = (value: string) => {
    if (value) {
      setFormData({ ...formData, toneType: value as 'description' | 'url' });
    }
  };

  const handleSliderChange = (value: number[]) => {
    setFormData({ ...formData, wordCount: value[0] });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setFormData({ ...formData, mediaFile: file });
    
    if (file) {
      toast.success(`File "${file.name}" selected`);
    }
  };

  const handleClearFile = () => {
    setFormData({...formData, mediaFile: null});
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Validate form
    if (!formData.prompt) {
      toast.error('Please enter an AI prompt to rank for');
      setIsLoading(false);
      return;
    }

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Store form data in localStorage (would be better in a real DB)
      localStorage.setItem('contentFormData', JSON.stringify(formData));
      
      toast.success('Content creation started!');
      
      // Navigate to results page
      navigate('/results');
    } catch (error) {
      console.error('Error submitting form:', error);
      toast.error('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-3xl mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl gradient-heading">Create Content</CardTitle>
        <CardDescription>
          Configure the parameters for your AI-generated content
        </CardDescription>
      </CardHeader>
      
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-6">
          {/* AI Prompt */}
          <PromptField 
            value={formData.prompt} 
            onChange={handleInputChange} 
          />
          
          {/* Country Dropdown */}
          <CountryField 
            value={formData.country}
            onChange={(value) => handleSelectChange('country', value)}
            isDetecting={isDetectingLocation}
          />
          
          {/* Language */}
          <LanguageField 
            value={formData.language}
            onChange={(value) => handleSelectChange('language', value)}
          />
          
          {/* Tone of Voice */}
          <ToneField 
            toneType={formData.toneType}
            tone={formData.tone}
            toneUrl={formData.toneUrl}
            onToneTypeChange={handleToneTypeChange}
            onInputChange={handleInputChange}
          />
          
          {/* AI Media */}
          <MediaField 
            useAiMedia={formData.useAiMedia}
            mediaFile={formData.mediaFile}
            onSwitchChange={(checked) => handleSwitchChange('useAiMedia', checked)}
            onFileChange={handleFileChange}
            onClearFile={handleClearFile}
          />
          
          {/* Word Count */}
          <WordCountField 
            value={formData.wordCount}
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
        </CardFooter>
      </form>
    </Card>
  );
};

export default FormSection;
