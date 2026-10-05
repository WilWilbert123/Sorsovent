"use client";

import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ImagePreviewProps {
  url: string;
  onRemove?: () => void;
  className?: string;
}

export function ImagePreview({ url, onRemove, className = "" }: ImagePreviewProps) {
  if (!url) return null;

  return (
    <div className={`relative group rounded-xl overflow-hidden border bg-muted ${className}`}>
      <img 
        src={url} 
        alt="Preview" 
        className="w-full h-full object-cover"
      />
      
      {onRemove && (
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            type="button"
            variant="destructive"
            size="icon"
            className="h-8 w-8 rounded-full shadow-sm"
            onClick={onRemove}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
