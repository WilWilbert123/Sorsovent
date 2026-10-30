"use client";

import { useState } from "react";
import { Share2, Check } from "lucide-react";
import { toast } from "sonner";

interface ProfileShareButtonProps {
  username: string;
  displayName: string;
}

export function ProfileShareButton({
  username,
  displayName,
}: ProfileShareButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    const url =
      typeof window !== "undefined"
        ? `${window.location.origin}/profile/${username}`
        : `https://readytomingle.vercel.app/profile/${username}`;

    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: `${displayName} (@${username}) on Mingle`,
          text: `Check out ${displayName}'s profile on Mingle Sorsogon.`,
          url,
        });
        return;
      } catch {
        // user cancelled or share failed; fall back to clipboard
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Profile link copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy profile link.");
    }
  };

  return (
    <button
      type="button"
      onClick={handleShare}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/40 hover:bg-black/60 active:scale-95 backdrop-blur-md border border-white/20 text-xs font-semibold text-white transition-all cursor-pointer"
      title="Share profile"
      aria-label="Share profile"
    >
      {copied ? (
        <>
          <Check className="h-3.5 w-3.5 text-emerald-400" />
          <span>Copied</span>
        </>
      ) : (
        <>
          <Share2 className="h-3.5 w-3.5 text-white/90" />
          <span>Share</span>
        </>
      )}
    </button>
  );
}
