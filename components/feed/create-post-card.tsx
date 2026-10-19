"use client";

import { useState, useRef } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import {
  MapPin,
  Image as ImageIcon,
  Loader2,
  X,
  Sparkles,
  ChevronDown,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { getCloudinaryAccounts } from "@/lib/cloudinary/utils";
import { createClient } from "@/lib/supabase/client";

const SORSOGON_MUNICIPALITIES = [
  "Sorsogon City",
  "Bulusan",
  "Donsol",
  "Gubat",
  "Bulan",
  "Matnog",
  "Barcelona",
  "Casiguran",
  "Castilla",
  "Irosin",
  "Juban",
  "Magallanes",
  "Pilar",
  "Prieto Diaz",
  "Santa Magdalena",
];

interface CreatePostCardProps {
  profile: {
    username: string | null;
    display_name?: string | null;
    full_name?: string | null;
    avatar_url: string | null;
  } | null;
  userId: string;
  onPostCreated?: (post: any) => void;
}

export function CreatePostCard({ profile, userId, onPostCreated }: CreatePostCardProps) {
  const [content, setContent] = useState("");
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const [isCustomLoc, setIsCustomLoc] = useState(false);
  const [customLocInput, setCustomLocInput] = useState("");
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isPosting, setIsPosting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const displayName = profile?.display_name || profile?.full_name || profile?.username || "You";
  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "U";

  // Handle image upload to Cloudinary
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Image file is too large (max 10MB).");
      return;
    }

    setIsUploadingImage(true);
    const toastId = toast.loading("Uploading photo...");

    try {
      const accounts = getCloudinaryAccounts();
      let uploadedUrl: string | null = null;

      for (const acc of accounts) {
        if (!acc.cloudName || !acc.uploadPreset) continue;
        const formData = new FormData();
        formData.append("file", file);
        formData.append("upload_preset", acc.uploadPreset);
        formData.append("folder", "posts");

        try {
          const res = await fetch(
            `https://api.cloudinary.com/v1_1/${acc.cloudName}/image/upload`,
            { method: "POST", body: formData }
          );
          if (res.ok) {
            const data = await res.json();
            uploadedUrl = data.secure_url;
            break;
          }
        } catch (uploadErr) {
          console.warn("Cloudinary fallback next account...", uploadErr);
        }
      }

      if (uploadedUrl) {
        setSelectedImages((prev) => [...prev, uploadedUrl!]);
        toast.success("Photo attached!", { id: toastId });
      } else {
        // Fallback: Read as data url for local preview if Cloudinary accounts unconfigured
        const reader = new FileReader();
        reader.onload = () => {
          setSelectedImages((prev) => [...prev, reader.result as string]);
          toast.info("Photo attached for post preview.", { id: toastId });
        };
        reader.readAsDataURL(file);
      }
    } catch (err: any) {
      toast.error("Failed to upload image. Please try again.", { id: toastId });
    } finally {
      setIsUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const removeImage = (index: number) => {
    setSelectedImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleCreatePost = async () => {
    if (!content.trim() && selectedImages.length === 0) {
      toast.error("Please enter some text or add a photo.");
      return;
    }

    setIsPosting(true);
    try {
      const locationToSave = isCustomLoc ? customLocInput.trim() : selectedLocation;

      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: content.trim(),
          location_name: locationToSave || null,
          media_urls: selectedImages,
        }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to create post");
      }

      const newPost = json.data;

      // Broadcast to other realtime clients
      const supabase = createClient();
      const channel = supabase.channel("realtime:home-feed");
      channel.send({
        type: "broadcast",
        event: "new_post",
        payload: newPost,
      });

      // Update parent feed optimistically
      if (onPostCreated) {
        onPostCreated(newPost);
      }

      // Reset composer
      setContent("");
      setSelectedLocation(null);
      setIsCustomLoc(false);
      setCustomLocInput("");
      setSelectedImages([]);

      toast.success("Post published to community feed!");
    } catch (err: any) {
      console.error("Post creation error:", err);
      toast.error(err.message || "Could not publish post. Please try again.");
    } finally {
      setIsPosting(false);
    }
  };

  return (
    <Card className="border border-border/80 dark:border-white/10 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] dark:shadow-[0_4px_20px_-4px_rgba(0,0,0,0.25)] bg-card/95 dark:bg-card/75 backdrop-blur-xl rounded-3xl overflow-hidden transition-all hover:border-primary/25">
      <CardContent className="p-4 sm:p-5">
        <div className="flex gap-3 sm:gap-3.5">
          <Avatar className="h-10 w-10 sm:h-11 sm:w-11 shrink-0 ring-2 ring-primary/10 shadow-xs">
            <AvatarImage src={profile?.avatar_url || undefined} alt={displayName} />
            <AvatarFallback className="text-xs font-semibold bg-primary/10 text-primary">
              {initials}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0 space-y-3">
            {/* Input Textarea */}
            <Textarea
              placeholder="What's happening around you in Sorsogon?"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="resize-none border-0 bg-transparent text-sm sm:text-base placeholder:text-muted-foreground/70 focus-visible:ring-0 p-0 min-h-[75px] leading-relaxed text-foreground"
              disabled={isPosting}
              maxLength={1000}
            />

            {/* Attached Images Preview */}
            {selectedImages.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
                {selectedImages.map((imgUrl, i) => (
                  <div
                    key={i}
                    className="relative group rounded-2xl overflow-hidden aspect-video border border-border/80 bg-muted shadow-xs"
                  >
                    <img
                      src={imgUrl}
                      alt="Attached preview"
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(i)}
                      className="absolute top-1.5 right-1.5 p-1 bg-black/70 hover:bg-black/90 text-white rounded-full transition-all opacity-90 group-hover:opacity-100 cursor-pointer"
                      aria-label="Remove image"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Selected Location Pill */}
            {(selectedLocation || (isCustomLoc && customLocInput)) && (
              <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full w-fit animate-in fade-in shadow-2xs">
                <MapPin className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{isCustomLoc ? customLocInput : selectedLocation}</span>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedLocation(null);
                    setIsCustomLoc(false);
                    setCustomLocInput("");
                  }}
                  className="hover:text-destructive ml-1 cursor-pointer"
                  aria-label="Clear location"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}

            {/* Custom Location input box when toggled */}
            {isCustomLoc && !selectedLocation && (
              <div className="flex items-center gap-2 pt-1 animate-in fade-in">
                <input
                  type="text"
                  placeholder="Type specific venue or landmark..."
                  value={customLocInput}
                  onChange={(e) => setCustomLocInput(e.target.value)}
                  className="text-xs bg-muted/60 border border-border/80 rounded-xl px-3 py-1.5 flex-1 outline-none focus:border-primary transition-colors text-foreground"
                />
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs px-2.5 rounded-lg"
                  onClick={() => setIsCustomLoc(false)}
                >
                  Cancel
                </Button>
              </div>
            )}

            {/* Action Bar */}
            <div className="flex items-center justify-between border-t border-border/60 pt-3">
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                {/* Hidden File Input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  onChange={handleFileChange}
                  className="hidden"
                />

                {/* Photo Button */}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingImage || isPosting}
                  className="h-8 text-xs font-semibold text-sky-600 dark:text-sky-400 bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/20 rounded-full px-3 gap-1.5 transition-all cursor-pointer"
                >
                  {isUploadingImage ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <ImageIcon className="h-3.5 w-3.5" />
                  )}
                  <span>Photo</span>
                </Button>

                {/* Location Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger
                    type="button"
                    className="h-8 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 rounded-full px-3 gap-1.5 inline-flex items-center cursor-pointer transition-all"
                  >
                    <MapPin className="h-3.5 w-3.5" />
                    <span>{selectedLocation || "Location"}</span>
                    <ChevronDown className="h-3 w-3 opacity-60" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-56 max-h-64 overflow-y-auto">
                    <DropdownMenuItem
                      onClick={() => {
                        setIsCustomLoc(true);
                        setSelectedLocation(null);
                      }}
                      className="text-primary font-medium text-xs cursor-pointer"
                    >
                      <Sparkles className="h-3.5 w-3.5 mr-2 text-primary" />
                      Custom landmark...
                    </DropdownMenuItem>
                    {SORSOGON_MUNICIPALITIES.map((mun) => (
                      <DropdownMenuItem
                        key={mun}
                        onClick={() => {
                          setSelectedLocation(mun);
                          setIsCustomLoc(false);
                        }}
                        className="text-xs cursor-pointer"
                      >
                        {mun}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Submit Post Button */}
              <div className="flex items-center gap-2">
                {content.length > 0 && (
                  <span className="text-[11px] font-mono text-muted-foreground/80">
                    {1000 - content.length}
                  </span>
                )}
                <Button
                  size="sm"
                  onClick={handleCreatePost}
                  disabled={(!content.trim() && selectedImages.length === 0) || isPosting || isUploadingImage}
                  className="rounded-full px-5 h-8.5 text-xs font-semibold shadow-md shadow-rose-500/20 bg-gradient-to-r from-[#FF5E3A] via-[#FF3366] to-[#E11D48] hover:opacity-95 text-white disabled:opacity-40 disabled:shadow-none transition-all active:scale-95 cursor-pointer"
                >
                  {isPosting && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                  Post
                </Button>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
