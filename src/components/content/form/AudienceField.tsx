
import React from 'react';
import { FormItem, FormLabel } from "@/components/ui/form";
import { Input } from "@/components/ui/input";

interface AudienceFieldProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const AudienceField = ({ value, onChange }: AudienceFieldProps) => {
  return (
    <FormItem>
      <FormLabel>Target Audience</FormLabel>
      <Input
        type="text"
        name="audience"
        value={value}
        onChange={onChange}
        placeholder="e.g., Beginners, Experts, Small Business Owners"
      />
    </FormItem>
  );
};

export default AudienceField;
