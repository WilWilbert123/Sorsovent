"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Camera, Loader2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ImageCropModal } from "@/components/ui/image-crop-modal";
import { getCloudinaryAccounts } from "@/lib/cloudinary/utils";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

interface ProfileAvatarUploaderProps {
  userId: string;
  avatarUrl: string | null;
  displayName: string;
  initials: string;
  isOwnProfile: boolean;
  isOnline?: boolean;
  className?: string;
  avatarClassName?: string;
  onAvatarUploaded?: (newUrl: string) => void;
}

export function ProfileAvatarUploader({
  userId,
  avatarUrl: initialAvatarUrl,
  displayName,
  initials,
  isOwnProfile,
  isOnline,
  className = "",
  avatarClassName = "h-22 w-22 sm:h-26 sm:w-26 ring-4 ring-card shadow-lg bg-card",
  onAvatarUploaded,
}: ProfileAvatarUploaderProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [avatarUrl, setAvatarUrl] = useState<string>(initialAvatarUrl || "");
  const [isUploading, setIsUploading] = useState(false);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [isCropOpen, setIsCropOpen] = useState(false);

  useEffect(() => {
    setAvatarUrl(initialAvatarUrl || "");
  }, [initialAvatarUrl]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select a valid image file (JPEG, PNG, or WebP).");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error("Image file is too large. Maximum size is 10MB.");
      return;
    }

    // Open crop modal
    const reader = new FileReader();
    reader.onload = () => {
      setCropSrc(reader.result as string);
      setIsCropOpen(true);
    };
    reader.readAsDataURL(file);
  };

  const uploadAndSaveAvatar = async (fileOrBlob: File | Blob) => {
    setIsUploading(true);
    const accounts = getCloudinaryAccounts();
    let uploadedUrl: string | null = null;
    let lastErrorMessage = "";

    for (const acc of accounts) {
      try {
        const formData = new FormData();
        formData.append("file", fileOrBlob, "avatar.jpg");
        formData.append("upload_preset", acc.uploadPreset);
        formData.append("folder", "avatars");

        const res = await fetch(
          `https://api.cloudinary.com/v1_1/${acc.cloudName}/image/upload`,
          {
            method: "POST",
            body: formData,
          }
        );

        const data = await res.json();
        if (res.ok && data.secure_url) {
          uploadedUrl = data.secure_url;
          break;
        } else {
          lastErrorMessage = data.error?.message || `Failed on ${acc.cloudName}`;
        }
      } catch (err: any) {
        lastErrorMessage = err.message || "Network error";
      }
    }

    if (!uploadedUrl) {
      toast.error(lastErrorMessage || "Failed to upload photo. Please try again.");
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    // Save to Supabase DB and Auth Metadata
    try {
      const supabase = createClient();
      const { error: dbError } = await supabase
        .from("profiles")
        .update({
          avatar_url: uploadedUrl,
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId);

      if (dbError) {
        throw dbError;
      }

      await supabase.auth.updateUser({
        data: { avatar_url: uploadedUrl },
      });

      setAvatarUrl(uploadedUrl);
      onAvatarUploaded?.(uploadedUrl);
      toast.success("Profile picture updated successfully!");
      router.refresh();
    } catch (err: any) {
      console.error("Failed to save avatar to profile:", err);
      toast.error("Image uploaded but failed to update profile: " + err.message);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className={`relative shrink-0 ${className}`}>
      {/* Hidden File Input */}
      {isOwnProfile && (
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          disabled={isUploading}
        />
      )}

      {/* Clickable Avatar container for owner */}
      <div
        className={`relative ${isOwnProfile ? "cursor-pointer group" : ""}`}
        onClick={() => {
          if (isOwnProfile && !isUploading) {
            fileInputRef.current?.click();
          }
        }}
        title={isOwnProfile ? "Click to change profile picture" : displayName}
      >
        <Avatar className={avatarClassName}>
          <AvatarImage src={avatarUrl || undefined} alt={displayName} className="object-cover" />
          <AvatarFallback className="text-xl sm:text-2xl font-extrabold bg-gradient-to-tr from-[#FF5E3A] to-[#FF3366] text-white">
            {initials}
          </AvatarFallback>
        </Avatar>

        {/* Live Online Dot on Avatar */}
        {isOnline && !isUploading && (
          <span
            className="absolute top-1 right-1 h-3.5 w-3.5 sm:h-4 sm:w-4 rounded-full bg-emerald-500 ring-2 ring-card z-20"
            title="Online now"
          >
            <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-75" />
          </span>
        )}

        {/* Hover / Active Camera Button for Owner */}
        {isOwnProfile && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              fileInputRef.current?.click();
            }}
            disabled={isUploading}
            aria-label="Change profile picture"
            className="absolute bottom-0 right-0 p-2 sm:p-2.5 bg-gradient-to-tr from-[#FF5E3A] to-[#FF3366] text-white rounded-full shadow-md hover:scale-105 active:scale-95 transition-transform ring-2 ring-card z-20 cursor-pointer"
          >
            {isUploading ? (
              <Loader2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 animate-spin" />
            ) : (
              <Camera className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            )}
          </button>
        )}

        {/* Loading overlay over avatar */}
        {isUploading && (
          <div className="absolute inset-0 rounded-full bg-black/60 backdrop-blur-xs flex flex-col items-center justify-center text-white z-10">
            <Loader2 className="h-6 w-6 animate-spin text-white mb-1" />
            <span className="text-[10px] font-bold">Saving...</span>
          </div>
        )}
      </div>

      {/* Image Crop Modal */}
      <ImageCropModal
        open={isCropOpen}
        onOpenChange={setIsCropOpen}
        imageSrc={cropSrc}
        onCropComplete={uploadAndSaveAvatar}
      />
    </div>
  );
}
