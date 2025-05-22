
import React from 'react';
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";

interface MediaFieldProps {
  useAiMedia: boolean;
  mediaFile: File | null;
  onSwitchChange: (checked: boolean) => void;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClearFile: () => void;
}

export const MediaField: React.FC<MediaFieldProps> = ({
  useAiMedia,
  mediaFile,
  onSwitchChange,
  onFileChange,
  onClearFile
}) => {
  return (
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
          checked={useAiMedia}
          onCheckedChange={onSwitchChange}
        />
      </div>
      
      {!useAiMedia && (
        <div className="space-y-2 pt-2">
          <Label htmlFor="mediaFile">Upload Media</Label>
          <div className="flex items-center gap-2">
            <Input
              id="mediaFile"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={onFileChange}
            />
            <Button 
              type="button" 
              variant="outline" 
              className="w-full flex items-center justify-center gap-2"
              onClick={() => document.getElementById('mediaFile')?.click()}
            >
              <Upload className="h-4 w-4" />
              {mediaFile ? mediaFile.name : "Choose file..."}
            </Button>
            {mediaFile && (
              <Button 
                type="button" 
                variant="ghost" 
                size="sm"
                onClick={onClearFile}
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
  );
};
