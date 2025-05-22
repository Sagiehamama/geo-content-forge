import React from 'react';
import { Card } from '@/components/ui/card';
import { Check } from 'lucide-react';
import { MediaImageOption } from '@/services/mediaAgentService';

interface ImageOptionProps {
  option: MediaImageOption | null;
  onSelect: () => void;
}

const PLACEHOLDER_IMAGE = 'https://via.placeholder.com/600x400?text=Image+Not+Found';

export const ImageOption: React.FC<ImageOptionProps> = ({ option, onSelect }) => {
  if (!option) {
    return (
      <Card 
        className="overflow-hidden cursor-pointer transition-all hover:shadow-md"
        onClick={onSelect}
      >
        <div className="p-2 flex flex-col">
          <div className="relative aspect-video rounded overflow-hidden bg-gray-50 border-2 border-dashed border-gray-300">
            <div className="absolute inset-0 flex items-center justify-center text-gray-500">
              <p className="text-center px-4">
                <span className="block text-lg font-medium mb-2">No Image</span>
                <span className="block text-sm">Remove image from this spot</span>
              </p>
            </div>
          </div>
          <div className="mt-2">
            <p className="text-sm font-medium">Remove Image</p>
            <p className="text-xs text-gray-500">Content will flow without an image</p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card 
      className="overflow-hidden cursor-pointer transition-all hover:shadow-md"
      onClick={onSelect}
    >
      <div className="p-2 flex flex-col">
        <div className="relative aspect-video rounded overflow-hidden bg-gray-100">
          <img 
            src={option.url} 
            alt={option.alt} 
            className="w-full h-full object-cover"
            onError={(e) => {
              console.error(`Failed to load image: ${option.url}`);
              e.currentTarget.src = PLACEHOLDER_IMAGE;
            }}
          />
        </div>
        <div className="mt-2">
          <p className="text-sm font-medium truncate">{option.caption}</p>
          <p className="text-xs text-gray-500">{option.source || 'Source: Unknown'}</p>
        </div>
      </div>
    </Card>
  );
};

export default ImageOption; 