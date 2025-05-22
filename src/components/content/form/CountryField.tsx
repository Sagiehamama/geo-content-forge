
import React from 'react';
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { countries } from './constants';

interface CountryFieldProps {
  value: string;
  onChange: (value: string) => void;
  isDetecting: boolean;
}

export const CountryField: React.FC<CountryFieldProps> = ({ 
  value, 
  onChange, 
  isDetecting 
}) => {
  return (
    <div className="space-y-2">
      <Label htmlFor="country">Country</Label>
      <div className="relative">
        <Select
          name="country"
          value={value}
          onValueChange={onChange}
          disabled={isDetecting}
        >
          <SelectTrigger id="country" className={isDetecting ? "bg-muted" : ""}>
            {isDetecting ? (
              <div className="flex items-center">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                <span>Detecting your location...</span>
              </div>
            ) : (
              <SelectValue placeholder="Select your target country" />
            )}
          </SelectTrigger>
          <SelectContent>
            {countries.map((country) => (
              <SelectItem key={country.code} value={country.code}>
                {country.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <p className="text-sm text-muted-foreground">
        Helps optimize content for your geographic area.
      </p>
    </div>
  );
};
