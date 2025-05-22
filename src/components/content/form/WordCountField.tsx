
import React from 'react';
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { FileText } from "lucide-react";

interface WordCountFieldProps {
  value: number;
  onChange: (value: number[]) => void;
}

export const WordCountField: React.FC<WordCountFieldProps> = ({ value, onChange }) => {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <Label htmlFor="wordCount">Word Count</Label>
        </div>
        <span className="text-sm font-medium text-primary">{value} words</span>
      </div>
      <Slider
        id="wordCount"
        defaultValue={[value]}
        max={3000}
        min={300}
        step={100}
        value={[value]}
        onValueChange={onChange}
        className="py-4"
      />
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>300</span>
        <span>3000</span>
      </div>
      <p className="text-sm text-muted-foreground">
        {value < 600 ? "Short-form content (good for social media)" : 
         value < 1200 ? "Medium-length content (good for blog posts)" : 
         "Long-form content (good for comprehensive guides)"}
      </p>
    </div>
  );
};
