"use client";

import { useEffect, useRef } from "react";

export function PresenceHeartbeat({ userId }: { userId?: string }) {
  const lastSentRef = useRef<number>(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!userId) return;

    const sendHeartbeat = async () => {
      // Don't send if tab is hidden
      if (typeof document !== "undefined" && document.hidden) {
        return;
      }

      // Throttle: don't send more frequently than every 30 seconds
      const now = Date.now();
      if (now - lastSentRef.current < 30_000) {
        return;
      }

      try {
        lastSentRef.current = now;
        await fetch("/api/presence/heartbeat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });
      } catch (err) {
        // Silently swallow network dropouts
      }
    };

    // 1. Send immediate heartbeat on mount
    sendHeartbeat();

    // 2. Setup 60-second recurring heartbeat
    intervalRef.current = setInterval(sendHeartbeat, 60_000);

    // 3. Listen for tab visibility changes
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        // User came back to the tab! Send immediate heartbeat to mark Online
        sendHeartbeat();
        // Restart the 60s interval
        if (intervalRef.current) clearInterval(intervalRef.current);
        intervalRef.current = setInterval(sendHeartbeat, 60_000);
      } else {
        // User left the tab or locked their device: pause interval
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [userId]);

  return null;
}
