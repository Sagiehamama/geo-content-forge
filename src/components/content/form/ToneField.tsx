
import React from 'react';
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FileInput } from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

interface ToneFieldProps {
  toneType: 'description' | 'url';
  tone: string;
  toneUrl: string;
  onToneTypeChange: (value: string) => void;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
}

export const ToneField: React.FC<ToneFieldProps> = ({
  toneType,
  tone,
  toneUrl,
  onToneTypeChange,
  onInputChange
}) => {
  return (
    <div className="space-y-4">
      <div>
        <Label className="block mb-2">Tone of Voice</Label>
        <ToggleGroup
          type="single"
          value={toneType}
          onValueChange={onToneTypeChange}
          className="justify-start mb-4"
        >
          <ToggleGroupItem value="description">Description</ToggleGroupItem>
          <ToggleGroupItem value="url">Reference URL</ToggleGroupItem>
        </ToggleGroup>
      </div>
      
      {toneType === 'url' ? (
        <div className="space-y-2">
          <Label htmlFor="toneUrl">Reference URL</Label>
          <div className="relative">
            <FileInput className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              id="toneUrl"
              name="toneUrl"
              placeholder="https://example.com/content-with-desired-tone"
              className="pl-8"
              value={toneUrl}
              onChange={onInputChange}
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
            value={tone}
            onChange={onInputChange}
            rows={3}
          />
        </div>
      )}
    </div>
  );
};
