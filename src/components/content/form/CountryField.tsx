import React, { useState } from 'react';
import { Label } from "@/components/ui/label";
import { Loader2, Search } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
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
  const [searchQuery, setSearchQuery] = useState('');
  
  // Filter countries based on search query
  const filteredCountries = searchQuery 
    ? countries.filter(country => 
        country.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        country.code.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : countries;
  
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
            <div className="flex items-center px-2 pb-2 sticky top-0 bg-white z-10 border-b">
              <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
              <Input
                placeholder="Search country..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 w-full"
              />
            </div>
            <div className="max-h-[300px] overflow-auto">
              {filteredCountries.map((country) => (
                <SelectItem key={country.code} value={country.code}>
                  {country.name}
                </SelectItem>
              ))}
              {filteredCountries.length === 0 && (
                <div className="p-2 text-center text-sm text-muted-foreground">
                  No countries found
                </div>
              )}
            </div>
          </SelectContent>
        </Select>
      </div>
      <p className="text-sm text-muted-foreground">
        Helps optimize content for your geographic area.
      </p>
    </div>
  );
};
