
import React from 'react';
import { Label } from "@/components/ui/label";
import { FileText, ShoppingBag, BookOpen } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

interface ContentTypeFieldProps {
  value: 'blog' | 'article' | 'product';
  onChange: (value: 'blog' | 'article' | 'product') => void;
}

export const ContentTypeField: React.FC<ContentTypeFieldProps> = ({ value, onChange }) => {
  return (
    <div className="space-y-2">
      <Label htmlFor="contentType">Content Type</Label>
      <RadioGroup
        id="contentType"
        value={value}
        onValueChange={(val) => onChange(val as 'blog' | 'article' | 'product')}
        className="grid grid-cols-3 gap-4"
      >
        <div>
          <RadioGroupItem
            value="blog"
            id="blog"
            className="peer sr-only"
          />
          <Label
            htmlFor="blog"
            className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
          >
            <BookOpen className="mb-3 h-6 w-6" />
            <span className="text-sm font-medium">Blog Post</span>
          </Label>
        </div>
        <div>
          <RadioGroupItem
            value="article"
            id="article"
            className="peer sr-only"
          />
          <Label
            htmlFor="article"
            className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
          >
            <FileText className="mb-3 h-6 w-6" />
            <span className="text-sm font-medium">Article</span>
          </Label>
        </div>
        <div>
          <RadioGroupItem
            value="product"
            id="product"
            className="peer sr-only"
          />
          <Label
            htmlFor="product"
            className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
          >
            <ShoppingBag className="mb-3 h-6 w-6" />
            <span className="text-sm font-medium">Product</span>
          </Label>
        </div>
      </RadioGroup>
    </div>
  );
};
