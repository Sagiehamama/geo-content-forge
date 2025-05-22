
import React from 'react';
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";

interface WordCountFieldProps {
  value: number;
  onChange: (value: number[]) => void;
}

export const WordCountField: React.FC<WordCountFieldProps> = ({ value, onChange }) => {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label htmlFor="wordCount">Word Count: {value}</Label>
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
    </div>
  );
};
