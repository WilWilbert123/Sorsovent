"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Camera, Loader2, Image as ImageIcon } from "lucide-react";
import { getCloudinaryAccounts } from "@/lib/cloudinary/utils";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

interface ProfileCoverUploaderProps {
  userId: string;
  coverUrl: string | null;
  displayName: string;
  isOwnProfile: boolean;
}

export function ProfileCoverUploader({
  userId,
  coverUrl: initialCoverUrl,
  displayName,
  isOwnProfile,
}: ProfileCoverUploaderProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [coverUrl, setCoverUrl] = useState<string>(initialCoverUrl || "");
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select a valid image file (JPEG, PNG, WebP).");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error("Cover image is too large. Maximum size is 10MB.");
      return;
    }

    setIsUploading(true);
    const accounts = getCloudinaryAccounts();
    let uploadedUrl: string | null = null;
    let lastErrorMessage = "";

    for (const acc of accounts) {
      try {
        const formData = new FormData();
        formData.append("file", file, "cover.jpg");
        formData.append("upload_preset", acc.uploadPreset);
        formData.append("folder", "covers");

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
      toast.error(lastErrorMessage || "Failed to upload cover photo. Please try again.");
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    try {
      const supabase = createClient();
      const { error: dbError } = await supabase
        .from("profiles")
        .update({
          cover_url: uploadedUrl,
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId);

      if (dbError) throw dbError;

      setCoverUrl(uploadedUrl);
      toast.success("Cover photo updated successfully!");
      router.refresh();
    } catch (err: any) {
      console.error("Failed to update cover_url:", err);
      toast.error("Image uploaded but failed to update profile cover: " + err.message);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <>
      {/* Background Image / Mesh */}
      {coverUrl ? (
        <img
          src={coverUrl}
          alt={`${displayName} cover`}
          className="w-full h-full object-cover transition-opacity duration-300"
        />
      ) : (
        <>
          <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-rose-950 to-orange-950" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,94,58,0.45),transparent_60%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(255,51,102,0.35),transparent_55%)]" />
          <div
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage:
                "radial-gradient(rgba(255,255,255,0.4) 1px, transparent 1px)",
              backgroundSize: "18px 18px",
            }}
          />
        </>
      )}

      {/* Subtle Bottom Vignette */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent pointer-events-none" />

      {/* Uploading Spinner Overlay */}
      {isUploading && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center text-white z-20">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/60 border border-white/20 text-xs font-semibold">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            <span>Updating cover...</span>
          </div>
        </div>
      )}

      {/* Hidden File Input */}
      {isOwnProfile && (
        <>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            disabled={isUploading}
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="absolute bottom-3 right-3.5 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-black/50 hover:bg-black/70 active:scale-95 backdrop-blur-md border border-white/20 text-[11px] font-semibold text-white/95 transition-all cursor-pointer z-10 shadow-xs"
            title="Change cover photo"
            aria-label="Change cover photo"
          >
            {isUploading ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Camera className="h-3 w-3" />
            )}
            <span className="hidden xs:inline sm:inline">Edit Cover</span>
          </button>
        </>
      )}
    </>
  );
}
