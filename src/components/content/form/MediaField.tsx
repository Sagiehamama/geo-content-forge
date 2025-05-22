import React from 'react';
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";

interface MediaFieldProps {
  mediaMode: 'auto' | 'manual';
  mediaFile: File | null;
  onToggle: (mode: 'auto' | 'manual') => void;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClearFile: () => void;
}

export const MediaField: React.FC<MediaFieldProps> = ({
  mediaMode,
  mediaFile,
  onToggle,
  onFileChange,
  onClearFile
}) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <Label htmlFor="mediaMode" className="block mb-1">Add Media Automatically</Label>
          <p className="text-sm text-muted-foreground">
            If enabled, the system will find and insert relevant images. If disabled, you can upload your own.
          </p>
        </div>
        <Switch
          id="mediaMode"
          checked={mediaMode === 'auto'}
          onCheckedChange={(checked) => onToggle(checked ? 'auto' : 'manual')}
        />
      </div>
      {mediaMode === 'manual' && (
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
