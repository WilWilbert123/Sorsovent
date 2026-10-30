"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { WifiOff, Wifi, RefreshCw, X, Loader2 } from "lucide-react";

export type ConnectionState = "online" | "offline" | "connecting" | "reconnected";

interface NetworkStatusBannerProps {
  onReconnect?: () => Promise<void> | void;
  pendingOfflineCount?: number;
  className?: string;
}

export function NetworkStatusBanner({
  onReconnect,
  pendingOfflineCount = 0,
  className = "",
}: NetworkStatusBannerProps) {
  const [status, setStatus] = useState<ConnectionState>("online");
  const [dismissed, setDismissed] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);
  const wasOfflineRef = useRef(false);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const checkConnectionActively = useCallback(async () => {
    if (typeof window === "undefined") return;

    if (!navigator.onLine) {
      wasOfflineRef.current = true;
      setStatus("offline");
      setDismissed(false);
      return;
    }

    setStatus("connecting");
    setDismissed(false);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4500);

    try {
      const res = await fetch("/api/health", {
        method: "GET",
        cache: "no-store",
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        if (onReconnect) {
          await onReconnect();
        }
        if (wasOfflineRef.current) {
          setStatus("reconnected");
          wasOfflineRef.current = false;
          if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
          reconnectTimerRef.current = setTimeout(() => {
            setStatus("online");
          }, 3200);
        } else {
          setStatus("online");
        }
      } else {
        wasOfflineRef.current = true;
        setStatus("offline");
      }
    } catch {
      clearTimeout(timeoutId);
      wasOfflineRef.current = true;
      setStatus("offline");
    }
  }, [onReconnect]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Read initial browser online state
    if (!navigator.onLine) {
      wasOfflineRef.current = true;
      setStatus("offline");
    }

    try {
      const ts = localStorage.getItem("mingle_offline_last_saved_at");
      if (ts) {
        const d = new Date(ts);
        if (!isNaN(d.getTime())) {
          setLastSavedTime(
            d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
          );
        }
      }
    } catch {
      // ignore storage errors
    }

    const handleOffline = () => {
      wasOfflineRef.current = true;
      setStatus("offline");
      setDismissed(false);
    };

    const handleOnline = () => {
      checkConnectionActively();
    };

    const handleCustomProbe = () => {
      setDismissed(false);
      checkConnectionActively();
    };

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);
    window.addEventListener("mingle:check-connection", handleCustomProbe);

    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("mingle:check-connection", handleCustomProbe);
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
    };
  }, [checkConnectionActively]);

  if (status === "online" || dismissed) {
    return null;
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className={`w-full transition-all duration-200 animate-in fade-in slide-in-from-top-1 ${className}`}
    >
      <div
        className={`flex items-center justify-between gap-2 px-3 py-1.5 rounded-xl border text-xs shadow-2xs backdrop-blur-md ${
          status === "offline"
            ? "bg-amber-950/90 dark:bg-amber-950/90 border-amber-500/35 text-amber-100"
            : status === "connecting"
            ? "bg-slate-900/90 dark:bg-slate-900/90 border-sky-500/35 text-sky-100"
            : "bg-emerald-950/90 dark:bg-emerald-950/90 border-emerald-500/35 text-emerald-100"
        }`}
      >
        <div className="flex items-center gap-2 min-w-0">
          {status === "offline" && (
            <span className="h-5 w-5 rounded-lg bg-amber-500/20 text-amber-300 flex items-center justify-center shrink-0">
              <WifiOff className="h-3 w-3" />
            </span>
          )}
          {status === "connecting" && (
            <span className="h-5 w-5 rounded-lg bg-sky-500/20 text-sky-300 flex items-center justify-center shrink-0">
              <Loader2 className="h-3 w-3 animate-spin" />
            </span>
          )}
          {status === "reconnected" && (
            <span className="h-5 w-5 rounded-lg bg-emerald-500/20 text-emerald-300 flex items-center justify-center shrink-0">
              <Wifi className="h-3 w-3" />
            </span>
          )}

          <div className="min-w-0 truncate">
            {status === "offline" && (
              <span className="font-medium">
                <strong className="font-bold text-white">Offline mode</strong>
                <span className="mx-1.5 opacity-50">•</span>
                <span className="text-amber-100/90">
                  Showing saved feed &amp; places
                  {pendingOfflineCount > 0
                    ? ` (${pendingOfflineCount} queued)`
                    : lastSavedTime
                    ? ` (saved ${lastSavedTime})`
                    : ""}
                </span>
              </span>
            )}
            {status === "connecting" && (
              <span className="font-medium">
                <strong className="font-bold text-white">Connecting...</strong>
                <span className="mx-1.5 opacity-50">•</span>
                <span className="text-sky-100/90">
                  Checking internet &amp; syncing updates
                </span>
              </span>
            )}
            {status === "reconnected" && (
              <span className="font-medium">
                <strong className="font-bold text-white">Back online</strong>
                <span className="mx-1.5 opacity-50">•</span>
                <span className="text-emerald-100/90">
                  Connection restored &amp; feed synced
                </span>
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {status === "offline" && (
            <button
              type="button"
              onClick={checkConnectionActively}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-white/10 hover:bg-white/20 text-[11px] font-semibold text-white transition-colors cursor-pointer"
              title="Retry connection"
            >
              <RefreshCw className="h-2.5 w-2.5" />
              <span>Retry</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="h-5 w-5 rounded-lg hover:bg-white/15 flex items-center justify-center text-white/75 hover:text-white transition-colors cursor-pointer"
            title="Dismiss notice"
            aria-label="Close connection banner"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      </div>
    </div>
  );
}

