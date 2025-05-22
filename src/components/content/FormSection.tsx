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
import { Search, FileInput, Upload } from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

interface FormData {
  prompt: string;
  country: string;
  language: string;
  tone: string;
  toneUrl: string;
  toneType: 'description' | 'url';
  useAiMedia: boolean;
  mediaFile: File | null;
  wordCount: number;
}

const initialFormData: FormData = {
  prompt: '',
  country: '',
  language: 'en',
  tone: '',
  toneUrl: '',
  toneType: 'description',
  useAiMedia: true,
  mediaFile: null,
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

const countries = [
  { code: 'US', name: 'United States' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'CA', name: 'Canada' },
  { code: 'AU', name: 'Australia' },
  { code: 'DE', name: 'Germany' },
  { code: 'FR', name: 'France' },
  { code: 'ES', name: 'Spain' },
  { code: 'IT', name: 'Italy' },
  { code: 'JP', name: 'Japan' },
  { code: 'CN', name: 'China' },
  { code: 'IN', name: 'India' },
  { code: 'BR', name: 'Brazil' },
  { code: 'MX', name: 'Mexico' },
  { code: 'ZA', name: 'South Africa' },
  { code: 'RU', name: 'Russia' },
  { code: 'KR', name: 'South Korea' },
  { code: 'SG', name: 'Singapore' },
  { code: 'AE', name: 'United Arab Emirates' },
  { code: 'SE', name: 'Sweden' },
  { code: 'CH', name: 'Switzerland' },
  { code: 'NL', name: 'Netherlands' },
];

const FormSection = () => {
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  // Detect user country on component mount
  useEffect(() => {
    const detectLocation = async () => {
      try {
        // First try using the Geolocation API
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(async (position) => {
            try {
              const { latitude, longitude } = position.coords;
              
              const response = await fetch(
                `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`
              );
              
              if (response.ok) {
                const data = await response.json();
                const countryCode = data.address?.country_code?.toUpperCase() || '';
                
                // Find the country in our list
                if (countryCode && countries.some(country => country.code === countryCode)) {
                  setFormData(prev => ({ ...prev, country: countryCode }));
                  console.log(`Country detected: ${countryCode}`);
                }
              }
            } catch (error) {
              console.error('Error with reverse geocoding:', error);
              // Silently fail, user will need to select country manually
            }
          }, (error) => {
            console.error('Geolocation permission denied or error:', error);
            // Silently fail, user will need to select country manually
          });
        }
      } catch (error) {
        console.error('Error detecting location:', error);
        // Silently fail, user will need to select country manually
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

  const handleToneTypeChange = (value: string) => {
    setFormData({ ...formData, toneType: value as 'description' | 'url' });
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
          
          {/* Country Dropdown */}
          <div className="space-y-2">
            <Label htmlFor="country">Country</Label>
            <Select
              name="country"
              value={formData.country}
              onValueChange={(value) => handleSelectChange('country', value)}
            >
              <SelectTrigger id="country">
                <SelectValue placeholder="Select your target country" />
              </SelectTrigger>
              <SelectContent>
                {countries.map((country) => (
                  <SelectItem key={country.code} value={country.code}>
                    {country.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
              <SelectTrigger id="language">
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
            <div>
              <Label className="block mb-2">Tone of Voice</Label>
              <ToggleGroup 
                type="single" 
                value={formData.toneType}
                onValueChange={handleToneTypeChange}
                className="justify-start mb-4"
              >
                <ToggleGroupItem value="description">Description</ToggleGroupItem>
                <ToggleGroupItem value="url">Reference URL</ToggleGroupItem>
              </ToggleGroup>
            </div>
            
            {formData.toneType === 'url' ? (
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
          <div className="space-y-4">
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
            
            {!formData.useAiMedia && (
              <div className="space-y-2 pt-2">
                <Label htmlFor="mediaFile">Upload Media</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="mediaFile"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                  <Button 
                    type="button" 
                    variant="outline" 
                    className="w-full flex items-center justify-center gap-2"
                    onClick={() => document.getElementById('mediaFile')?.click()}
                  >
                    <Upload className="h-4 w-4" />
                    {formData.mediaFile ? formData.mediaFile.name : "Choose file..."}
                  </Button>
                  {formData.mediaFile && (
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="sm"
                      onClick={() => setFormData({...formData, mediaFile: null})}
                    >
                      Clear
                    </Button>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  Upload your own images to use in the generated content.
                </p>
              </div>
            )}
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
