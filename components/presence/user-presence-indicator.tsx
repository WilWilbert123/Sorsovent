"use client";

import { useEffect, useState } from "react";
import { getPresenceStatus } from "@/lib/utils/presence";
import { cn } from "@/lib/utils";

interface UserPresenceIndicatorProps {
  lastSeenAt?: string | null;
  showText?: boolean;
  size?: "sm" | "md";
  avatarDot?: boolean;
  className?: string;
}

export function UserPresenceIndicator({
  lastSeenAt,
  showText = false,
  size = "md",
  avatarDot = false,
  className,
}: UserPresenceIndicatorProps) {
  const [status, setStatus] = useState(() => getPresenceStatus(lastSeenAt));

  useEffect(() => {
    // Initial evaluation
    setStatus(getPresenceStatus(lastSeenAt));

    // Re-check every 30 seconds to update relative time ("Active 2m ago" -> "Active 3m ago")
    const interval = setInterval(() => {
      setStatus(getPresenceStatus(lastSeenAt));
    }, 30_000);

    return () => clearInterval(interval);
  }, [lastSeenAt]);

  const dotSize = size === "sm" ? "h-2.5 w-2.5" : "h-3.5 w-3.5";

  // When used as an overlay on an avatar image
  if (avatarDot) {
    return (
      <span
        title={status.statusText}
        className={cn(
          "block rounded-full border border-white dark:border-slate-900 shrink-0 shadow-xs",
          dotSize,
          status.isOnline
            ? "bg-emerald-500"
            : "bg-neutral-400 dark:bg-neutral-500",
          className
        )}
      />
    );
  }

  // Standard inline indicator (e.g. next to username)
  return (
    <div className={cn("inline-flex items-center gap-1.5 leading-none", className)}>
      <span
        className={cn(
          "inline-block rounded-full border border-white/90 dark:border-slate-900 shrink-0",
          size === "sm" ? "h-2 w-2" : "h-2.5 w-2.5",
          status.isOnline
            ? "bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.4)]"
            : "bg-muted-foreground/40"
        )}
      />

      {showText && (
        <span
          className={cn(
            "text-xs transition-colors",
            status.isOnline ? "text-emerald-600 dark:text-emerald-400 font-medium" : "text-muted-foreground"
          )}
        >
          {status.statusText}
        </span>
      )}
    </div>
  );
}
