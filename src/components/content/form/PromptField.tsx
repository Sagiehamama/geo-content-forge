
import React from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Search } from "lucide-react";

interface PromptFieldProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const PromptField: React.FC<PromptFieldProps> = ({ value, onChange }) => {
  return (
    <div className="space-y-2">
      <Label htmlFor="prompt">AI Prompt to Rank For <span className="text-destructive">*</span></Label>
      <div className="relative">
        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          id="prompt"
          name="prompt"
          placeholder="Enter the search query you want to rank for..."
          className="pl-8"
          value={value}
          onChange={onChange}
        />
      </div>
      <p className="text-sm text-muted-foreground">
        This is the search term your content will be optimized for.
      </p>
    </div>
  );
};
