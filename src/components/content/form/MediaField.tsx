import React from 'react';
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Upload, X } from "lucide-react";

interface MediaFieldProps {
  mediaMode: 'auto' | 'manual';
  mediaFiles: File[];
  onToggle: (mode: 'auto' | 'manual') => void;
  onFilesChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveFile: (index: number) => void;
  onClearFiles: () => void;
}

export const MediaField: React.FC<MediaFieldProps> = ({
  mediaMode,
  mediaFiles,
  onToggle,
  onFilesChange,
  onRemoveFile,
  onClearFiles
}) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <Label htmlFor="mediaMode" className="block mb-1">Add Media Automatically</Label>
          <p className="text-sm text-muted-foreground">
            If enabled, the system will generate or find relevant images and properly cite them. If disabled, you can upload your own.
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
          <Label htmlFor="mediaFiles">Upload Media</Label>
          <div className="flex items-center gap-2">
            <Input
              id="mediaFiles"
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={onFilesChange}
            />
            <Button 
              type="button" 
              variant="outline" 
              className="w-full flex items-center justify-center gap-2"
              onClick={() => document.getElementById('mediaFiles')?.click()}
            >
              <Upload className="h-4 w-4" />
              {mediaFiles.length === 0 ? "Choose files..." : 
               mediaFiles.length === 1 ? "1 file selected" :
               `${mediaFiles.length} files selected`}
            </Button>
            {mediaFiles.length > 0 && (
              <Button 
                type="button" 
                variant="ghost" 
                size="sm"
                onClick={onClearFiles}
              >
                Clear All
              </Button>
            )}
          </div>
          
          {/* Show selected files */}
          {mediaFiles.length > 0 && (
            <div className="space-y-2 pt-2">
              <Label className="text-sm">Selected files:</Label>
              {mediaFiles.map((file, index) => (
                <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded-md">
                  <span className="text-sm truncate">{file.name}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => onRemoveFile(index)}
                    className="h-6 w-6 p-0"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}
          
          <p className="text-sm text-muted-foreground">
            Upload your own images to use in the generated content. You can select multiple files.
          </p>
        </div>
      )}
    </div>
  );
};
