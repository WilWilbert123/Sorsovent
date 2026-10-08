"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Upload, X, Loader2, Image as ImageIcon, Crop } from "lucide-react";
import { toast } from "sonner";
import { getCloudinaryAccounts } from "@/lib/cloudinary/utils";
import { ImageCropModal } from "@/components/ui/image-crop-modal";

interface CloudinaryUploadProps {
  onUploadSuccess: (url: string) => void;
  folder?: string;
  preset?: string;
  className?: string;
  enableCrop?: boolean;
}

export function CloudinaryUpload({
  onUploadSuccess,
  folder = "general",
  preset,
  className = "",
  enableCrop,
}: CloudinaryUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [isCropOpen, setIsCropOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const shouldCrop = enableCrop ?? folder === "avatars";

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size (10MB max for initial selection)
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File is too large. Maximum size is 10MB.");
      return;
    }

    if (shouldCrop) {
      // Open crop modal first
      const reader = new FileReader();
      reader.onload = () => {
        setCropSrc(reader.result as string);
        setIsCropOpen(true);
      };
      reader.readAsDataURL(file);
    } else {
      // Direct upload
      await uploadFileToCloudinary(file);
    }
  };

  const uploadFileToCloudinary = async (fileOrBlob: File | Blob) => {
    setIsUploading(true);

    const accounts = getCloudinaryAccounts();
    let uploadSuccess = false;
    let lastErrorMessage = "";

    for (const acc of accounts) {
      try {
        const targetPreset = preset || acc.uploadPreset;
        const formData = new FormData();
        formData.append("file", fileOrBlob, "avatar.jpg");
        formData.append("upload_preset", targetPreset);
        formData.append("folder", folder);

        const uploadRes = await fetch(
          `https://api.cloudinary.com/v1_1/${acc.cloudName}/image/upload`,
          {
            method: "POST",
            body: formData,
          }
        );

        const uploadData = await uploadRes.json();

        if (uploadRes.ok && uploadData.secure_url) {
          onUploadSuccess(uploadData.secure_url);
          toast.success("Image uploaded successfully!");
          uploadSuccess = true;
          break;
        } else {
          lastErrorMessage =
            uploadData.error?.message || `Failed on cloud ${acc.cloudName}`;
          console.warn(
            `[Cloudinary] Account ${acc.cloudName} upload failed, trying next account...`,
            lastErrorMessage
          );
        }
      } catch (err: any) {
        lastErrorMessage = err.message || "Network error";
        console.warn(`[Cloudinary] Error uploading to ${acc.cloudName}:`, err);
      }
    }

    if (!uploadSuccess) {
      toast.error(
        lastErrorMessage ||
          "Failed to upload image. Please check your Cloudinary preset config."
      );
    }

    setIsUploading(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleCropComplete = async (croppedBlob: Blob) => {
    await uploadFileToCloudinary(croppedBlob);
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
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <span>Uploading image...</span>
          </>
        ) : (
          <>
            {shouldCrop ? (
              <Crop className="h-5 w-5 text-primary" />
            ) : (
              <ImageIcon className="h-5 w-5" />
            )}
            <span>
              {shouldCrop
                ? "Click to select & crop picture"
                : "Click to upload image"}
            </span>
          </>
        )}
      </Button>

      {/* Image Crop Modal */}
      <ImageCropModal
        open={isCropOpen}
        onOpenChange={setIsCropOpen}
        imageSrc={cropSrc}
        onCropComplete={handleCropComplete}
      />
    </div>
  );
}
