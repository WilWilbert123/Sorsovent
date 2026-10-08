"use client";

import { useState, useRef, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ZoomIn, ZoomOut, RotateCw, Check, X, Crop } from "lucide-react";

interface ImageCropModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageSrc: string | null;
  onCropComplete: (croppedBlob: Blob) => void;
}

export function ImageCropModal({
  open,
  onOpenChange,
  imageSrc,
  onCropComplete,
}: ImageCropModalProps) {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  // Reset controls on image load
  useEffect(() => {
    if (open) {
      setZoom(1);
      setRotation(0);
      setPan({ x: 0, y: 0 });
    }
  }, [open, imageSrc]);

  if (!open || !imageSrc) return null;

  // Touch & Mouse Dragging handlers
  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setIsDragging(true);
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    setDragStart({ x: clientX - pan.x, y: clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDragging) return;
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    setPan({
      x: clientX - dragStart.x,
      y: clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  // Perform canvas crop
  const handleApplyCrop = () => {
    if (!imageRef.current) return;

    const img = imageRef.current;
    const canvas = document.createElement("canvas");
    const outputSize = 400; // Output high-res 400x400 avatar
    canvas.width = outputSize;
    canvas.height = outputSize;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Background circle clip
    ctx.beginPath();
    ctx.arc(outputSize / 2, outputSize / 2, outputSize / 2, 0, Math.PI * 2);
    ctx.clip();

    ctx.save();

    // Center canvas context
    ctx.translate(outputSize / 2, outputSize / 2);
    ctx.rotate((rotation * Math.PI) / 180);

    // Calculate crop scaling factor based on container viewport (240px circle)
    const viewportSize = 240;
    const scaleFactor = outputSize / viewportSize;

    const scaledWidth = img.naturalWidth * zoom * (viewportSize / img.naturalWidth);
    const drawWidth = (img.naturalWidth / img.naturalHeight) >= 1
      ? viewportSize * zoom * (img.naturalWidth / img.naturalHeight)
      : viewportSize * zoom;

    const drawHeight = (img.naturalWidth / img.naturalHeight) >= 1
      ? viewportSize * zoom
      : viewportSize * zoom * (img.naturalHeight / img.naturalWidth);

    ctx.drawImage(
      img,
      (pan.x * scaleFactor) - (drawWidth * scaleFactor) / 2,
      (pan.y * scaleFactor) - (drawHeight * scaleFactor) / 2,
      drawWidth * scaleFactor,
      drawHeight * scaleFactor
    );

    ctx.restore();

    canvas.toBlob(
      (blob) => {
        if (blob) {
          onCropComplete(blob);
          onOpenChange(false);
        }
      },
      "image/jpeg",
      0.92
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card border-border rounded-2xl p-6">
        <DialogHeader>
          <DialogTitle className="text-base font-bold flex items-center gap-2">
            <Crop className="h-5 w-5 text-primary" />
            Crop Profile Picture
          </DialogTitle>
        </DialogHeader>

        {/* Interactive Viewport */}
        <div className="flex flex-col items-center justify-center py-2 space-y-4">
          <div
            ref={containerRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onTouchStart={handleMouseDown}
            onTouchMove={handleMouseMove}
            onTouchEnd={handleMouseUp}
            className="relative w-60 h-60 rounded-full overflow-hidden bg-black/90 cursor-grab active:cursor-grabbing border-4 border-primary/40 shadow-xl select-none"
          >
            {/* Image being cropped */}
            <img
              ref={imageRef}
              src={imageSrc}
              alt="Crop target"
              draggable={false}
              className="absolute max-w-none transition-transform duration-75 origin-center pointer-events-none"
              style={{
                transform: `translate(-50%, -50%) translate(${pan.x}px, ${pan.y}px) scale(${zoom}) rotate(${rotation}deg)`,
                top: "50%",
                left: "50%",
                minWidth: "100%",
                minHeight: "100%",
                objectFit: "contain",
              }}
            />

            {/* Circular Guide Lines Overlay */}
            <div className="absolute inset-0 border border-white/20 rounded-full pointer-events-none ring-1 ring-black/40" />
          </div>

          <p className="text-xs text-muted-foreground text-center">
            Drag image to adjust position inside the circle.
          </p>

          {/* Zoom & Rotation Controls */}
          <div className="w-full space-y-3 px-2">
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={() => setZoom((z) => Math.max(1, z - 0.2))}
              >
                <ZoomOut className="h-4 w-4" />
              </Button>

              <input
                type="range"
                min="1"
                max="3"
                step="0.05"
                value={zoom}
                onChange={(e) => setZoom(parseFloat(e.target.value))}
                className="flex-1 h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
              />

              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={() => setZoom((z) => Math.min(3, z + 0.2))}
              >
                <ZoomIn className="h-4 w-4" />
              </Button>

              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-8 w-8 shrink-0 rounded-lg ml-1"
                onClick={handleRotate}
                title="Rotate 90°"
              >
                <RotateCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter className="flex gap-2 sm:gap-0 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="w-full sm:w-auto rounded-xl text-xs"
          >
            <X className="h-3.5 w-3.5 mr-1" />
            Cancel
          </Button>

          <Button
            type="button"
            onClick={handleApplyCrop}
            className="w-full sm:w-auto rounded-xl text-xs font-semibold shadow-sm"
          >
            <Check className="h-3.5 w-3.5 mr-1" />
            Save & Apply Crop
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
