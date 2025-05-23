import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Search, Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface ResearchFieldProps {
  enableResearch: boolean;
  researchQuery: string;
  onSwitchChange: (checked: boolean) => void;
  onQueryChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const ResearchField: React.FC<ResearchFieldProps> = ({
  enableResearch,
  researchQuery,
  onSwitchChange,
  onQueryChange,
}) => {
  return (
    <Card className="border-blue-200 bg-blue-50/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Search className="h-5 w-5 text-blue-600" />
            <CardTitle className="text-lg text-blue-800">Reddit Research Agent</CardTitle>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="h-4 w-4 text-blue-500" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p>Discovers relevant Reddit discussions and enriches your content with authentic community insights and terminology</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <Switch
            checked={enableResearch}
            onCheckedChange={onSwitchChange}
          />
        </div>
      </CardHeader>
      
      {enableResearch && (
        <CardContent className="pt-0">
          <div className="space-y-2">
            <Label htmlFor="researchQuery" className="text-sm font-medium">
              Research Query (optional)
            </Label>
            <Input
              id="researchQuery"
              name="researchQuery"
              value={researchQuery}
              onChange={onQueryChange}
              placeholder="Enter specific research focus (e.g., 'API rate limiting best practices')"
              className="bg-white"
            />
            <p className="text-xs text-blue-600">
              Leave empty to automatically research your main prompt topic
            </p>
          </div>
        </CardContent>
      )}
    </Card>
  );
}; 