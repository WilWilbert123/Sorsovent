"use client";

import { useState, useEffect } from "react";
import {
  requestPushPermissionAndGetToken,
  disablePushNotifications,
} from "@/lib/firebase/client";
import { PushPreferencesCard } from "@/components/notifications/push-preferences-card";
import {
  Bell,
  BellOff,
  Check,
  Loader2,
  ShieldAlert,
  Sliders,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export function PushNotificationBanner() {
  const [permissionState, setPermissionState] = useState<
    NotificationPermission | "unsupported" | "disabled"
  >("default");
  const [isLoading, setIsLoading] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setPermissionState(Notification.permission);
    } else {
      setPermissionState("unsupported");
    }
  }, []);

  async function handleEnablePush() {
    setIsLoading(true);
    const token = await requestPushPermissionAndGetToken();
    setIsLoading(false);

    if (token) {
      setPermissionState("granted");
      toast.success("Push notifications enabled!");
    } else if (Notification.permission === "denied") {
      setPermissionState("denied");
      toast.error("Push permission was blocked in your browser settings.");
    } else {
      toast.error("Could not obtain push token.");
    }
  }

  async function handleDisablePush() {
    setIsLoading(true);
    const ok = await disablePushNotifications();
    setIsLoading(false);

    if (ok) {
      setPermissionState("disabled");
      toast.success("Push notifications muted.");
    } else {
      toast.error("Failed to disable push notifications.");
    }
  }

  if (permissionState === "unsupported") {
    return null;
  }

  const isGranted = permissionState === "granted";

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl border border-border/80 bg-card shadow-2xs">
        {/* Status Indicator */}
        <div className="flex items-center gap-2 min-w-0">
          <div
            className={`h-7 w-7 rounded-lg flex items-center justify-center shrink-0 ${
              isGranted
                ? "bg-emerald-500/12 text-emerald-600 dark:text-emerald-400"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {isGranted ? (
              <Bell className="h-3.5 w-3.5" />
            ) : (
              <BellOff className="h-3.5 w-3.5" />
            )}
          </div>
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-xs font-semibold text-foreground truncate">
              {isGranted
                ? "Push Alerts"
                : permissionState === "disabled"
                ? "Push Muted"
                : "Push Alerts Off"}
            </span>
            {isGranted && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/12 text-emerald-600 dark:text-emerald-400 shrink-0">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Active
              </span>
            )}
          </div>
        </div>

        {/* Compact Controls */}
        <div className="flex items-center gap-1.5 shrink-0">
          <Button
            onClick={() => setShowPreferences((prev) => !prev)}
            variant="outline"
            size="sm"
            className="h-7 px-2.5 gap-1 text-[11px] font-medium rounded-lg border-border/80 cursor-pointer"
          >
            <Sliders className="h-3 w-3" />
            <span>Channels</span>
            {showPreferences ? (
              <ChevronUp className="h-3 w-3 opacity-60" />
            ) : (
              <ChevronDown className="h-3 w-3 opacity-60" />
            )}
          </Button>

          {isGranted ? (
            <Button
              onClick={handleDisablePush}
              disabled={isLoading}
              variant="ghost"
              size="sm"
              className="h-7 px-2.5 gap-1 text-[11px] font-medium rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer"
            >
              {isLoading ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <BellOff className="h-3 w-3" />
              )}
              <span>Mute</span>
            </Button>
          ) : permissionState === "denied" ? (
            <Badge
              variant="outline"
              className="gap-1 border-amber-500/40 text-amber-600 dark:text-amber-400 py-0.5 text-[10px]"
            >
              <ShieldAlert className="h-3 w-3" /> Blocked
            </Badge>
          ) : (
            <Button
              onClick={handleEnablePush}
              disabled={isLoading}
              size="sm"
              className="h-7 px-2.5 gap-1 text-[11px] font-semibold rounded-lg cursor-pointer"
            >
              {isLoading ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Check className="h-3 w-3" />
              )}
              <span>Enable</span>
            </Button>
          )}
        </div>
      </div>

      {/* Expandable Granular Push Channels Section */}
      {showPreferences && (
        <div className="p-3.5 rounded-xl border border-border/80 bg-card shadow-xs animate-in fade-in-50 duration-150">
          <PushPreferencesCard showTitle={false} />
        </div>
      )}
    </div>
  );
}
