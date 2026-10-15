"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ZoomIn, ZoomOut, RotateCw, Check, X, Crop, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

interface ImageCropModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageSrc: string | null;
  onCropComplete: (croppedBlob: Blob) => void;
}

const CROP_DIAMETER = 240; // Viewport circle diameter in px

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
  const [naturalSize, setNaturalSize] = useState({ width: 0, height: 0 });

  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const dragStartRef = useRef({ x: 0, y: 0 });

  // Calculate base display dimensions so the image always covers the 240px circle at 1x zoom
  const minDim = Math.min(naturalSize.width, naturalSize.height) || CROP_DIAMETER;
  const baseScale = minDim > 0 ? CROP_DIAMETER / minDim : 1;
  const baseWidth = naturalSize.width > 0 ? naturalSize.width * baseScale : CROP_DIAMETER;
  const baseHeight = naturalSize.height > 0 ? naturalSize.height * baseScale : CROP_DIAMETER;

  // Clamping helper: ensures the image never slips out of the circular crop area
  const clampPan = useCallback(
    (newX: number, newY: number, currentZoom: number, currentRot: number) => {
      const isRotated90 = currentRot % 180 !== 0;
      const effW = (isRotated90 ? baseHeight : baseWidth) * currentZoom;
      const effH = (isRotated90 ? baseWidth : baseHeight) * currentZoom;

      const maxPanX = Math.max(0, (effW - CROP_DIAMETER) / 2);
      const maxPanY = Math.max(0, (effH - CROP_DIAMETER) / 2);

      return {
        x: Math.max(-maxPanX, Math.min(maxPanX, newX)),
        y: Math.max(-maxPanY, Math.min(maxPanY, newY)),
      };
    },
    [baseWidth, baseHeight]
  );

  // Reset controls whenever a new image is loaded
  useEffect(() => {
    if (open) {
      setZoom(1);
      setRotation(0);
      setPan({ x: 0, y: 0 });
      setIsDragging(false);
    }
  }, [open, imageSrc]);

  // Load natural image dimensions
  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    setNaturalSize({
      width: img.naturalWidth || CROP_DIAMETER,
      height: img.naturalHeight || CROP_DIAMETER,
    });
    setPan({ x: 0, y: 0 });
  };

  // Pointer event handlers with pointer capture (smooth, never loses drag)
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
    dragStartRef.current = {
      x: e.clientX - pan.x,
      y: e.clientY - pan.y,
    };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    e.preventDefault();
    const rawX = e.clientX - dragStartRef.current.x;
    const rawY = e.clientY - dragStartRef.current.y;
    setPan(clampPan(rawX, rawY, zoom, rotation));
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    setIsDragging(false);
    try {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    } catch {}
  };

  // Mouse wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const step = e.deltaY < 0 ? 0.1 : -0.1;
    const newZoom = Math.min(3, Math.max(1, +(zoom + step).toFixed(2)));
    setZoom(newZoom);
    setPan((prev) => clampPan(prev.x, prev.y, newZoom, rotation));
  };

  // Rotate 90 degrees clockwise
  const handleRotate = () => {
    const newRot = (rotation + 90) % 360;
    setRotation(newRot);
    setPan((prev) => clampPan(prev.x, prev.y, zoom, newRot));
  };

  // Reset view to default center
  const handleReset = () => {
    setZoom(1);
    setRotation(0);
    setPan({ x: 0, y: 0 });
  };

  // Zoom slider change
  const handleZoomChange = (newZoom: number) => {
    setZoom(newZoom);
    setPan((prev) => clampPan(prev.x, prev.y, newZoom, rotation));
  };

  // 1:1 WYSIWYG Canvas Export
  const handleApplyCrop = () => {
    if (!imageRef.current || naturalSize.width === 0) return;
    const img = imageRef.current;

    const outputSize = 512; // 512x512 high-resolution avatar
    const canvas = document.createElement("canvas");
    canvas.width = outputSize;
    canvas.height = outputSize;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    // 1. Clip circle mask
    ctx.beginPath();
    ctx.arc(outputSize / 2, outputSize / 2, outputSize / 2, 0, Math.PI * 2);
    ctx.clip();

    // 2. Exact scale factor: 240px screen circle -> 512px output circle
    const scale = outputSize / CROP_DIAMETER;

    // 3. Translate to center + user pan offset
    ctx.save();
    ctx.translate(
      outputSize / 2 + pan.x * scale,
      outputSize / 2 + pan.y * scale
    );

    // 4. Rotate around center
    if (rotation !== 0) {
      ctx.rotate((rotation * Math.PI) / 180);
    }

    // 5. Draw image centered (exact 1:1 match with DOM display)
    const drawWidth = baseWidth * zoom * scale;
    const drawHeight = baseHeight * zoom * scale;

    ctx.drawImage(
      img,
      -drawWidth / 2,
      -drawHeight / 2,
      drawWidth,
      drawHeight
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
      0.95
    );
  };

  if (!open || !imageSrc) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card border-border rounded-2xl p-5 sm:p-6 shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-base font-bold flex items-center gap-2">
            <Crop className="h-5 w-5 text-primary" />
            Crop Profile Picture
          </DialogTitle>
        </DialogHeader>

        {/* Interactive Viewport Area */}
        <div className="flex flex-col items-center justify-center py-1 space-y-3">
          <div
            ref={containerRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            onWheel={handleWheel}
            className="relative w-[280px] h-[280px] sm:w-[300px] sm:h-[300px] overflow-hidden rounded-2xl bg-neutral-950 flex items-center justify-center cursor-grab active:cursor-grabbing select-none touch-none border border-border/50 shadow-inner"
          >
            {/* The Image (rendered with precise pixel math) */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              ref={imageRef}
              src={imageSrc}
              alt="Crop target"
              onLoad={handleImageLoad}
              draggable={false}
              style={{
                width: `${baseWidth}px`,
                height: `${baseHeight}px`,
                transform: `translate(${pan.x}px, ${pan.y}px) rotate(${rotation}deg) scale(${zoom})`,
                transformOrigin: "center center",
                maxWidth: "none",
                maxHeight: "none",
              }}
              className="pointer-events-none select-none transition-transform duration-75"
            />

            {/* Darkened Outer Mask with Circular Cutout Viewport */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div
                style={{
                  width: `${CROP_DIAMETER}px`,
                  height: `${CROP_DIAMETER}px`,
                  boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.65)",
                }}
                className="rounded-full border-2 border-white/90 shadow-2xl relative"
              >
                {/* Rule of thirds grid lines (visible while dragging) */}
                <div
                  className={cn(
                    "absolute inset-0 rounded-full transition-opacity duration-150 pointer-events-none",
                    isDragging ? "opacity-100" : "opacity-0"
                  )}
                >
                  <div className="absolute left-1/3 top-0 bottom-0 w-px bg-white/30" />
                  <div className="absolute right-1/3 top-0 bottom-0 w-px bg-white/30" />
                  <div className="absolute top-1/3 left-0 right-0 h-px bg-white/30" />
                  <div className="absolute bottom-1/3 left-0 right-0 h-px bg-white/30" />
                </div>
              </div>
            </div>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            Drag to reposition • Scroll to zoom
          </p>

          {/* Controls: Zoom, Rotate, Reset */}
          <div className="w-full space-y-2 px-1">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0 rounded-lg text-muted-foreground hover:text-foreground"
                onClick={() => handleZoomChange(Math.max(1, +(zoom - 0.2).toFixed(2)))}
                title="Zoom out"
              >
                <ZoomOut className="h-4 w-4" />
              </Button>

              <input
                type="range"
                min="1"
                max="3"
                step="0.02"
                value={zoom}
                onChange={(e) => handleZoomChange(parseFloat(e.target.value))}
                className="flex-1 h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
              />

              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0 rounded-lg text-muted-foreground hover:text-foreground"
                onClick={() => handleZoomChange(Math.min(3, +(zoom + 0.2).toFixed(2)))}
                title="Zoom in"
              >
                <ZoomIn className="h-4 w-4" />
              </Button>

              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-8 w-8 shrink-0 rounded-lg text-muted-foreground hover:text-foreground ml-1"
                onClick={handleRotate}
                title="Rotate 90°"
              >
                <RotateCw className="h-4 w-4" />
              </Button>

              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-8 w-8 shrink-0 rounded-lg text-muted-foreground hover:text-foreground"
                onClick={handleReset}
                title="Reset to center"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter className="flex gap-2 sm:gap-0 pt-2 border-t mt-1">
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
