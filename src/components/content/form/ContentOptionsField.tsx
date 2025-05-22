
import React from 'react';
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Image, FileJson } from "lucide-react";

interface ContentOptionsFieldProps {
  includeImages: boolean;
  includeFrontmatter: boolean;
  onSwitchChange: (name: string, checked: boolean) => void;
}

export const ContentOptionsField: React.FC<ContentOptionsFieldProps> = ({
  includeImages,
  includeFrontmatter,
  onSwitchChange
}) => {
  return (
    <div className="space-y-4">
      <Label className="text-base">Content Features</Label>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Image className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Include AI-generated images</span>
          </div>
          <Switch
            id="includeImages"
            checked={includeImages}
            onCheckedChange={(checked) => onSwitchChange('includeImages', checked)}
          />
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <FileJson className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Generate YAML frontmatter</span>
          </div>
          <Switch
            id="includeFrontmatter"
            checked={includeFrontmatter}
            onCheckedChange={(checked) => onSwitchChange('includeFrontmatter', checked)}
          />
        </div>
      </div>
      <p className="text-sm text-muted-foreground">
        YAML frontmatter includes metadata like title, description, tags, and publish date.
      </p>
    </div>
  );
};
