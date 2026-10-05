"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Upload, X, Loader2, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";

interface CloudinaryUploadProps {
  onUploadSuccess: (url: string) => void;
  folder?: string;
  preset?: string;
  className?: string;
}

export function CloudinaryUpload({ 
  onUploadSuccess, 
  folder = "general", 
  preset = "sorsovent_uploads",
  className = ""
}: CloudinaryUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File is too large. Maximum size is 5MB.");
      return;
    }

    setIsUploading(true);

    try {
      // 1. Get signature from our secure API
      const sigResponse = await fetch("/api/cloudinary/signature", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folder }),
      });
      
      const sigData = await sigResponse.json();
      
      if (!sigResponse.ok) {
        throw new Error(sigData.error || "Failed to get upload signature");
      }

      // 2. Upload to Cloudinary using FormData
      const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "demo";
      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", preset);
      formData.append("folder", folder);
      
      // In a real implementation with valid signatures, we'd append these:
      // formData.append("timestamp", sigData.timestamp);
      // formData.append("signature", sigData.signature);
      // formData.append("api_key", process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY || "");

      // Send directly to Cloudinary
      const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: "POST",
        body: formData,
      });

      const uploadData = await uploadRes.json();
      
      if (!uploadRes.ok) {
        throw new Error(uploadData.error?.message || "Failed to upload image");
      }

      onUploadSuccess(uploadData.secure_url);
      toast.success("Image uploaded successfully");
      
    } catch (error: any) {
      console.error("Upload error:", error);
      toast.error(error.message || "Failed to upload image. Try again.");
    } finally {
      setIsUploading(false);
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return (
    <div className={`relative ${className}`}>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/jpeg, image/png, image/webp"
        className="hidden"
      />
      <Button 
        type="button" 
        variant="outline" 
        onClick={() => fileInputRef.current?.click()}
        disabled={isUploading}
        className="w-full flex gap-2 items-center justify-center border-dashed border-2 py-8 h-auto text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors bg-muted/20"
      >
        {isUploading ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Uploading...</span>
          </>
        ) : (
          <>
            <ImageIcon className="h-5 w-5" />
            <span>Click to upload image</span>
          </>
        )}
      </Button>
    </div>
  );
}
