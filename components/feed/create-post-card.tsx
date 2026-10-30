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
  Globe,
  Send,
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
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const [isCustomLoc, setIsCustomLoc] = useState(false);
  const [customLocInput, setCustomLocInput] = useState("");
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isPosting, setIsPosting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const displayName =
    profile?.display_name || profile?.full_name || profile?.username || "You";
  const initials =
    displayName
      .split(" ")
      .filter(Boolean)
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "U";

  const hasActiveDraft =
    content.trim().length > 0 ||
    selectedImages.length > 0 ||
    Boolean(selectedLocation) ||
    isCustomLoc ||
    isUploadingImage;

  const showFullComposer = isExpanded || hasActiveDraft;

  const openComposerAndFocus = () => {
    setIsExpanded(true);
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 30);
  };

  // Handle image upload to Cloudinary
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Image file is too large (max 10MB).");
      return;
    }

    setIsExpanded(true);
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

    const locationToSave = isCustomLoc ? customLocInput.trim() : selectedLocation;
    const trimmedContent = content.trim();

    const savePostOffline = () => {
      const nowIso = new Date().toISOString();
      const offlinePost = {
        id: `offline_${Date.now()}`,
        author_id: userId,
        content: trimmedContent,
        location_name: locationToSave || null,
        created_at: nowIso,
        updated_at: nowIso,
        profiles: {
          id: userId,
          username: profile?.username || "you",
          full_name: profile?.full_name || displayName,
          display_name: profile?.display_name || displayName,
          avatar_url: profile?.avatar_url || null,
        },
        author_role: "USER",
        likes: [],
        like_count: 0,
        liked: false,
        comments: [],
        comment_count: 0,
        post_media: selectedImages.map((url, idx) => ({
          media_url: url,
          media_type: "image",
          display_order: idx,
        })),
        media_urls: selectedImages,
        is_offline_queued: true,
      };

      try {
        const queueKey = `mingle_offline_post_queue_${userId}`;
        const existingRaw = localStorage.getItem(queueKey);
        const existingQueue = existingRaw ? JSON.parse(existingRaw) : [];
        existingQueue.push({
          tempId: offlinePost.id,
          content: trimmedContent,
          location_name: locationToSave || null,
          media_urls: selectedImages,
          createdAt: nowIso,
        });
        localStorage.setItem(queueKey, JSON.stringify(existingQueue));
      } catch {
        // ignore storage quota errors
      }

      if (onPostCreated) {
        onPostCreated(offlinePost);
      }

      setContent("");
      setSelectedLocation(null);
      setIsCustomLoc(false);
      setCustomLocInput("");
      setSelectedImages([]);
      setIsExpanded(false);

      toast.info("Saved offline — will publish automatically when connected.");
    };

    if (typeof window !== "undefined" && !navigator.onLine) {
      savePostOffline();
      return;
    }

    setIsPosting(true);
    try {
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: trimmedContent,
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
      setIsExpanded(false);

      toast.success("Post published to community feed!");
    } catch (err: any) {
      if (typeof window !== "undefined" && (!navigator.onLine || err instanceof TypeError)) {
        savePostOffline();
      } else {
        console.error("Post creation error:", err);
        toast.error(err.message || "Could not publish post. Please try again.");
      }
    } finally {
      setIsPosting(false);
    }
  };

  return (
    <Card className="border border-border/80 dark:border-white/10 shadow-xs bg-card/95 dark:bg-card/85 backdrop-blur-xl rounded-2xl sm:rounded-3xl overflow-hidden transition-all">
      {/* Hidden File Input (always mounted so Photo trigger works in both compact & expanded views) */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        onChange={handleFileChange}
        className="hidden"
      />

      <CardContent className="p-3 sm:p-4">
        {!showFullComposer ? (
          /* ── Compact Social Composer Row (Saves vertical space on mobile) ── */
          <div className="flex items-center gap-2.5">
            <Avatar className="h-9 w-9 sm:h-10 sm:w-10 ring-2 ring-primary/15 shrink-0">
              <AvatarImage src={profile?.avatar_url || undefined} alt={displayName} />
              <AvatarFallback className="text-xs font-bold bg-gradient-to-tr from-[#FF5E3A] to-[#FF3366] text-white">
                {initials}
              </AvatarFallback>
            </Avatar>

            <button
              type="button"
              onClick={openComposerAndFocus}
              className="flex-1 min-w-0 h-10 px-3.5 rounded-full bg-muted/65 hover:bg-muted border border-border/60 text-left text-xs sm:text-sm text-muted-foreground/85 hover:text-foreground transition-all truncate cursor-pointer"
            >
              What&apos;s happening in Sorsogon?
            </button>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploadingImage}
              className="h-9 px-3 rounded-full bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/20 inline-flex items-center gap-1.5 text-xs font-semibold shrink-0 transition-all active:scale-95 cursor-pointer"
              title="Add photo"
              aria-label="Add photo"
            >
              {isUploadingImage ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <ImageIcon className="h-3.5 w-3.5" />
              )}
              <span className="hidden xs:inline">Photo</span>
            </button>
          </div>
        ) : (
          /* ── Expanded Composer View ── */
          <div className="space-y-3 animate-in fade-in duration-150">
            {/* User Author Header */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <Avatar className="h-9 w-9 sm:h-10 sm:w-10 ring-2 ring-primary/20 shadow-2xs shrink-0">
                  <AvatarImage src={profile?.avatar_url || undefined} alt={displayName} />
                  <AvatarFallback className="text-xs font-bold bg-gradient-to-tr from-[#FF5E3A] to-[#FF3366] text-white">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="font-bold text-xs sm:text-sm text-foreground truncate">
                    {displayName}
                  </p>
                  <span className="inline-flex items-center gap-1 text-[10px] font-medium text-muted-foreground bg-muted/60 border border-border/50 px-2 py-0.5 rounded-full mt-0.5">
                    <Globe className="h-2.5 w-2.5 text-primary" />
                    <span>Public · Sorsogon</span>
                  </span>
                </div>
              </div>

              {!hasActiveDraft && (
                <button
                  type="button"
                  onClick={() => setIsExpanded(false)}
                  className="h-7 w-7 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors cursor-pointer"
                  aria-label="Collapse composer"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Input Textarea - text-base on mobile prevents iOS Safari zoom */}
            <Textarea
              ref={textareaRef}
              placeholder="Share an update, hangout, or spot in Sorsogon..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="resize-none border-0 bg-transparent text-base sm:text-sm placeholder:text-muted-foreground/60 focus-visible:ring-0 p-0 min-h-[68px] leading-relaxed text-foreground"
              disabled={isPosting}
              maxLength={1000}
            />

            {/* Attached Images Preview */}
            {selectedImages.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
                {selectedImages.map((imgUrl, i) => (
                  <div
                    key={i}
                    className="relative group rounded-2xl overflow-hidden aspect-video border border-border/80 bg-muted shadow-2xs"
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
              <div className="flex items-center gap-1.5 text-xs text-rose-600 dark:text-rose-400 font-semibold bg-rose-500/10 border border-rose-500/20 px-3 py-1 rounded-full w-fit animate-in fade-in shadow-2xs">
                <MapPin className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">
                  {isCustomLoc ? customLocInput : selectedLocation}
                </span>
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
                  className="text-base sm:text-xs bg-muted/60 border border-border/80 rounded-xl px-3 py-1.5 flex-1 outline-none focus:border-primary transition-colors text-foreground"
                />
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 text-xs px-2.5 rounded-lg"
                  onClick={() => setIsCustomLoc(false)}
                >
                  Cancel
                </Button>
              </div>
            )}

            {/* Action Bar */}
            <div className="flex items-center justify-between border-t border-border/60 dark:border-white/10 pt-2.5">
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                {/* Photo Button */}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingImage || isPosting}
                  className="h-8 text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 rounded-full px-3 gap-1.5 transition-all cursor-pointer active:scale-95"
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
                    className="h-8 text-xs font-semibold text-muted-foreground hover:text-foreground bg-muted/60 hover:bg-muted border border-border/60 rounded-full px-3 gap-1.5 inline-flex items-center cursor-pointer transition-all active:scale-95"
                  >
                    <MapPin className="h-3.5 w-3.5 text-primary" />
                    <span className="max-w-[110px] truncate">
                      {selectedLocation || "Location"}
                    </span>
                    <ChevronDown className="h-3 w-3 opacity-60 shrink-0" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="start"
                    className="w-56 max-h-64 overflow-y-auto rounded-2xl"
                  >
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
                  <span className="text-[11px] font-mono text-muted-foreground/70">
                    {1000 - content.length}
                  </span>
                )}
                <Button
                  size="sm"
                  onClick={handleCreatePost}
                  disabled={
                    (!content.trim() && selectedImages.length === 0) ||
                    isPosting ||
                    isUploadingImage
                  }
                  className="rounded-full px-4 sm:px-5 h-8 text-xs font-bold shadow-md shadow-rose-500/20 bg-gradient-to-r from-orange-500 via-rose-500 to-pink-500 hover:from-orange-600 hover:via-rose-600 hover:to-pink-600 text-white disabled:opacity-40 disabled:shadow-none transition-all active:scale-95 cursor-pointer gap-1.5"
                >
                  {isPosting ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Send className="h-3 w-3" />
                  )}
                  <span>Post</span>
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
