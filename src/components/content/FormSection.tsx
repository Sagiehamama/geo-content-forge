
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { toast } from 'sonner';
import { Search, FileInput, Calendar } from "lucide-react";

interface FormData {
  prompt: string;
  location: string;
  language: string;
  tone: string;
  toneUrl: string;
  useAiMedia: boolean;
  wordCount: number;
}

const initialFormData: FormData = {
  prompt: '',
  location: '',
  language: 'en',
  tone: '',
  toneUrl: '',
  useAiMedia: true,
  wordCount: 1000,
};

const languages = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'it', name: 'Italian' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'ru', name: 'Russian' },
  { code: 'zh', name: 'Chinese' },
  { code: 'ja', name: 'Japanese' }
];

const FormSection = () => {
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [isLoading, setIsLoading] = useState(false);
  const [useToneUrl, setUseToneUrl] = useState(false);
  const navigate = useNavigate();

  // Detect user location on component mount
  useEffect(() => {
    const detectLocation = async () => {
      try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject);
        });
        
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${position.coords.latitude}&lon=${position.coords.longitude}&format=json`
        );
        
        if (response.ok) {
          const data = await response.json();
          const city = data.address?.city || data.address?.town || data.address?.village || '';
          const country = data.address?.country || '';
          const location = [city, country].filter(Boolean).join(', ');
          
          setFormData(prev => ({ ...prev, location }));
        }
      } catch (error) {
        console.error('Error detecting location:', error);
        // Silent fail, user can manually input location
      }
    };

    // Try to detect location
    detectLocation();
    
    // Try to detect browser language
    const browserLang = navigator.language.split('-')[0];
    if (languages.some(lang => lang.code === browserLang)) {
      setFormData(prev => ({ ...prev, language: browserLang }));
    }
  }, []);

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

  const handleSliderChange = (value: number[]) => {
    setFormData({ ...formData, wordCount: value[0] });
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

    // Here we would normally send the data to an API
    // For now, let's simulate a successful response
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
          <div className="space-y-2">
            <Label htmlFor="prompt">AI Prompt to Rank For <span className="text-destructive">*</span></Label>
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                id="prompt"
                name="prompt"
                placeholder="Enter the search query you want to rank for..."
                className="pl-8"
                value={formData.prompt}
                onChange={handleInputChange}
              />
            </div>
            <p className="text-sm text-muted-foreground">
              This is the search term your content will be optimized for.
            </p>
          </div>
          
          {/* Location */}
          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              name="location"
              placeholder="Your location for geo-optimization"
              value={formData.location}
              onChange={handleInputChange}
            />
            <p className="text-sm text-muted-foreground">
              Helps optimize content for your geographic area.
            </p>
          </div>
          
          {/* Language */}
          <div className="space-y-2">
            <Label htmlFor="language">Language</Label>
            <Select
              name="language"
              value={formData.language}
              onValueChange={(value) => handleSelectChange('language', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select language" />
              </SelectTrigger>
              <SelectContent>
                {languages.map((lang) => (
                  <SelectItem key={lang.code} value={lang.code}>
                    {lang.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* Tone of Voice */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="toneType">Use URL for Tone Reference</Label>
              <Switch
                id="toneType"
                checked={useToneUrl}
                onCheckedChange={(checked) => setUseToneUrl(checked)}
              />
            </div>
            
            {useToneUrl ? (
              <div className="space-y-2">
                <Label htmlFor="toneUrl">Reference URL</Label>
                <div className="relative">
                  <FileInput className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="toneUrl"
                    name="toneUrl"
                    placeholder="https://example.com/content-with-desired-tone"
                    className="pl-8"
                    value={formData.toneUrl}
                    onChange={handleInputChange}
                  />
                </div>
                <p className="text-sm text-muted-foreground">
                  We'll analyze this content to match its tone and style.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="tone">Tone Description</Label>
                <Textarea
                  id="tone"
                  name="tone"
                  placeholder="Describe the desired tone (e.g., professional, friendly, authoritative)..."
                  value={formData.tone}
                  onChange={handleInputChange}
                  rows={3}
                />
              </div>
            )}
          </div>
          
          {/* AI Media */}
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="useAiMedia" className="block mb-1">Auto-search AI Media</Label>
              <p className="text-sm text-muted-foreground">
                Automatically find relevant images for your content
              </p>
            </div>
            <Switch
              id="useAiMedia"
              checked={formData.useAiMedia}
              onCheckedChange={(checked) => handleSwitchChange('useAiMedia', checked)}
            />
          </div>
          
          {/* Word Count */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="wordCount">Word Count: {formData.wordCount}</Label>
            </div>
            <Slider
              id="wordCount"
              defaultValue={[1000]}
              max={3000}
              min={300}
              step={100}
              value={[formData.wordCount]}
              onValueChange={handleSliderChange}
              className="py-4"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>300</span>
              <span>3000</span>
            </div>
          </div>
        </CardContent>
        
        <CardFooter>
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Processing..." : "Generate Content"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
};

export default FormSection;
