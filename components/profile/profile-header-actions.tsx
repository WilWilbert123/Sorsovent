"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Copy, Check } from "lucide-react";
import { toast } from "sonner";

export function ProfileBackButton() {
  const router = useRouter();

  const handleBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push("/home");
    }
  };

  return (
    <button
      type="button"
      onClick={handleBack}
      className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-black/40 hover:bg-black/60 active:scale-90 backdrop-blur-md border border-white/20 text-white transition-all cursor-pointer shadow-xs"
      title="Go back"
      aria-label="Go back"
    >
      <ArrowLeft className="h-4 w-4" />
    </button>
  );
}

export function CopyUsernamePill({ username }: { username: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(`@${username}`);
      setCopied(true);
      toast.success(`Copied @${username} to clipboard!`);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy handle.");
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="inline-flex items-center gap-1 text-xs sm:text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors group cursor-pointer"
      title="Click to copy handle"
    >
      <span>@{username}</span>
      {copied ? (
        <Check className="h-3 w-3 text-emerald-500" />
      ) : (
        <Copy className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground" />
      )}
    </button>
  );
}
