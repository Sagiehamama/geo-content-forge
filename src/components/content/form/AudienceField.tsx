
import React from 'react';
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Users } from "lucide-react";

interface AudienceFieldProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const AudienceField: React.FC<AudienceFieldProps> = ({ value, onChange }) => {
  return (
    <div className="space-y-2">
      <Label htmlFor="audience">Target Audience</Label>
      <div className="relative">
        <Users className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          id="audience"
          name="audience"
          placeholder="Describe your target audience (e.g., beginners, professionals, parents)..."
          className="pl-8"
          value={value}
          onChange={onChange}
        />
      </div>
      <p className="text-sm text-muted-foreground">
        Helps tailor content to the knowledge level and interests of your audience.
      </p>
    </div>
  );
};
