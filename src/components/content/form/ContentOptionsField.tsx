import React from 'react';
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { FileJson } from "lucide-react";

interface ContentOptionsFieldProps {
  includeFrontmatter: boolean;
  onSwitchChange: (name: string, checked: boolean) => void;
}

export const ContentOptionsField: React.FC<ContentOptionsFieldProps> = ({
  includeFrontmatter,
  onSwitchChange
}) => {
  // This component no longer renders anything as frontmatter is always enabled
  // The includeFrontmatter prop is still used internally but not shown in UI
  return null;
};
