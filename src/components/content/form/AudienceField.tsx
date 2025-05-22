
import React from 'react';
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Target } from "lucide-react";

interface AudienceFieldProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const AudienceField: React.FC<AudienceFieldProps> = ({ value, onChange }) => {
  return (
    <div className="space-y-2">
      <Label htmlFor="audience">Target Audience</Label>
      <div className="relative">
        <Target className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          id="audience"
          name="audience"
          placeholder="e.g., Beginners, Experts, Small Business Owners..."
          className="pl-8"
          value={value}
          onChange={onChange}
        />
      </div>
      <p className="text-sm text-muted-foreground">
        Specify who this content is intended for.
      </p>
    </div>
  );
};
