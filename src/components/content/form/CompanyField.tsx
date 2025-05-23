import React, { useState, useEffect } from 'react';
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Building2, Save, Plus, Trash2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

interface CompanyFieldProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
}

interface SavedCompanyPrompt {
  id: string;
  name: string;
  prompt: string;
  createdAt: string;
}

const STORAGE_KEY = 'saved-company-prompts';

export const CompanyField: React.FC<CompanyFieldProps> = ({ value = '', onChange }) => {
  const [savedPrompts, setSavedPrompts] = useState<SavedCompanyPrompt[]>([]);
  const [selectedPromptId, setSelectedPromptId] = useState<string>('');
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [savePromptName, setSavePromptName] = useState('');

  // Load saved prompts from localStorage on component mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setSavedPrompts(JSON.parse(saved));
      } catch (error) {
        console.error('Error loading saved company prompts:', error);
      }
    }
  }, []);

  // Save prompts to localStorage whenever savedPrompts changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(savedPrompts));
  }, [savedPrompts]);

  const handleSavePrompt = () => {
    if (!value || !value.trim()) {
      toast.error('Please enter a company prompt before saving');
      return;
    }
    if (!savePromptName.trim()) {
      toast.error('Please enter a name for the saved prompt');
      return;
    }

    const newPrompt: SavedCompanyPrompt = {
      id: Date.now().toString(),
      name: savePromptName.trim(),
      prompt: value.trim(),
      createdAt: new Date().toISOString(),
    };

    setSavedPrompts(prev => [...prev, newPrompt]);
    setSavePromptName('');
    setShowSaveDialog(false);
    toast.success(`Company prompt "${newPrompt.name}" saved successfully`);
  };

  const handleLoadPrompt = (promptId: string) => {
    if (promptId === 'new') {
      setSelectedPromptId('');
      const syntheticEvent = {
        target: {
          name: 'company',
          value: '',
        },
      } as React.ChangeEvent<HTMLTextAreaElement>;
      onChange(syntheticEvent);
      return;
    }

    const prompt = savedPrompts.find(p => p.id === promptId);
    if (prompt) {
      setSelectedPromptId(promptId);
      const syntheticEvent = {
        target: {
          name: 'company',
          value: prompt.prompt,
        },
      } as React.ChangeEvent<HTMLTextAreaElement>;
      onChange(syntheticEvent);
      toast.success(`Loaded "${prompt.name}"`);
    }
  };

  const handleDeletePrompt = (promptId: string) => {
    const prompt = savedPrompts.find(p => p.id === promptId);
    if (prompt) {
      setSavedPrompts(prev => prev.filter(p => p.id !== promptId));
      if (selectedPromptId === promptId) {
        setSelectedPromptId('');
      }
      toast.success(`Deleted "${prompt.name}"`);
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e);
    // Clear selection if user starts typing manually
    if (selectedPromptId) {
      setSelectedPromptId('');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label htmlFor="company">Company/Brand Context</Label>
        <div className="flex items-center gap-2">
          {savedPrompts.length > 0 && (
            <Select value={selectedPromptId} onValueChange={handleLoadPrompt}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Load saved prompt..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="new">
                  <div className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    New prompt
                  </div>
                </SelectItem>
                {savedPrompts.map((prompt) => (
                  <SelectItem key={prompt.id} value={prompt.id}>
                    <div className="flex items-center justify-between w-full">
                      <span>{prompt.name}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-4 w-4 p-0 ml-2"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeletePrompt(prompt.id);
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {value && value.trim() && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowSaveDialog(true)}
              className="flex items-center gap-1"
            >
              <Save className="h-4 w-4" />
              Save
            </Button>
          )}
        </div>
      </div>

      <div className="relative">
        <Building2 className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
        <Textarea
          id="company"
          name="company"
          placeholder="Describe the company/brand to highlight in the content. E.g., 'TechCorp is a leading fintech company specializing in AI-powered payment solutions. Founded in 2020, they serve over 10,000 businesses globally and focus on security and innovation...'"
          className="pl-8 min-h-[100px]"
          value={value}
          onChange={handleTextareaChange}
          rows={4}
        />
      </div>

      {showSaveDialog && (
        <div className="p-4 border rounded-lg bg-muted/50">
          <Label htmlFor="savePromptName" className="block mb-2">
            Save this company prompt as:
          </Label>
          <div className="flex gap-2">
            <input
              id="savePromptName"
              type="text"
              placeholder="e.g., TechCorp - Fintech Company"
              className="flex-1 px-3 py-2 border rounded-md"
              value={savePromptName}
              onChange={(e) => setSavePromptName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSavePrompt()}
            />
            <Button onClick={handleSavePrompt} size="sm">
              Save
            </Button>
            <Button 
              variant="outline" 
              onClick={() => {
                setShowSaveDialog(false);
                setSavePromptName('');
              }} 
              size="sm"
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      <p className="text-sm text-muted-foreground">
        Optional: Provide context about the company or brand you want to highlight in the content. 
        This helps create more targeted, brand-aware articles that improve visibility in generative search results.
      </p>
    </div>
  );
}; 