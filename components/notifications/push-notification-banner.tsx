"use client";

import { useState, useEffect } from "react";
import {
  requestPushPermissionAndGetToken,
  disablePushNotifications,
  syncPushTokenIfGranted,
  isIOSDevice,
  isStandalonePWA,
  canUseWebPush,
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
  Smartphone,
  Share,
  PlusSquare,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export function PushNotificationBanner() {
  const [permissionState, setPermissionState] = useState<
    NotificationPermission | "unsupported" | "disabled" | "ios-browser"
  >("default");
  const [isLoading, setIsLoading] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const ios = isIOSDevice();
    const standalone = isStandalonePWA();
    const webPushSupported = canUseWebPush();

    if ("Notification" in window && webPushSupported) {
      setPermissionState(Notification.permission);
      if (Notification.permission === "granted") {
        syncPushTokenIfGranted();
      }
    } else if (ios && !standalone) {
      setPermissionState("ios-browser");
    } else if ("Notification" in window) {
      setPermissionState(Notification.permission);
    } else {
      setPermissionState("unsupported");
    }
  }, []);

  async function handleEnablePush() {
    if (permissionState === "ios-browser") {
      setShowIOSGuide((prev) => !prev);
      return;
    }

    setIsLoading(true);
    const token = await requestPushPermissionAndGetToken();
    setIsLoading(false);

    if (token) {
      setPermissionState("granted");
      toast.success("Push notifications enabled on this device!");
    } else if (typeof Notification !== "undefined" && Notification.permission === "denied") {
      setPermissionState("denied");
      toast.error("Push permission is blocked in your browser/device settings.");
    } else if (isIOSDevice() && !isStandalonePWA()) {
      setPermissionState("ios-browser");
      setShowIOSGuide(true);
      toast.info("Add Mingle to your iOS Home Screen to enable background push alerts.");
    } else {
      toast.error("Could not activate push token. Live in-app alerts remain active.");
    }
  }

  async function handleDisablePush() {
    setIsLoading(true);
    const ok = await disablePushNotifications();
    setIsLoading(false);

    if (ok) {
      setPermissionState("disabled");
      toast.success("Background push notifications muted on this device.");
    } else {
      toast.error("Failed to mute push notifications.");
    }
  }

  const isGranted = permissionState === "granted";
  const isIOSBrowser = permissionState === "ios-browser";

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 rounded-2xl border border-border/80 bg-card shadow-2xs">
        {/* Status Indicator */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className={`h-8 w-8 rounded-xl flex items-center justify-center shrink-0 ${
              isGranted
                ? "bg-emerald-500/12 text-emerald-600 dark:text-emerald-400"
                : isIOSBrowser
                ? "bg-primary/12 text-primary"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {isGranted ? (
              <Bell className="h-4 w-4" />
            ) : isIOSBrowser ? (
              <Smartphone className="h-4 w-4" />
            ) : (
              <BellOff className="h-4 w-4" />
            )}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-bold text-foreground truncate">
                {isGranted
                  ? "Realtime & Push Alerts"
                  : isIOSBrowser
                  ? "iOS Live Alerts Active"
                  : permissionState === "disabled"
                  ? "Push Muted"
                  : "Realtime Alerts Active"}
              </span>
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/12 text-emerald-600 dark:text-emerald-400 shrink-0">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                {isGranted ? "Push On" : "Live Sync"}
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground truncate">
              {isGranted
                ? "Receiving instant background & in-app notifications"
                : isIOSBrowser
                ? "Add to Home Screen on iPhone for lock-screen push"
                : "Enable push to receive alerts when the app is closed"}
            </p>
          </div>
        </div>

        {/* Compact Controls */}
        <div className="flex items-center gap-1.5 shrink-0 ml-auto">
          <Button
            onClick={() => setShowPreferences((prev) => !prev)}
            variant="outline"
            size="sm"
            className="h-7.5 px-2.5 gap-1 text-[11px] font-medium rounded-xl border-border/80 cursor-pointer"
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
              className="h-7.5 px-2.5 gap-1 text-[11px] font-medium rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer"
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
          ) : isIOSBrowser ? (
            <Button
              onClick={() => setShowIOSGuide((prev) => !prev)}
              size="sm"
              className="h-7.5 px-2.5 gap-1 text-[11px] font-semibold rounded-xl bg-gradient-to-r from-[#FF5E3A] to-[#FF3366] text-white border-0 cursor-pointer"
            >
              <Sparkles className="h-3 w-3" />
              <span>iOS Push</span>
            </Button>
          ) : permissionState !== "unsupported" ? (
            <Button
              onClick={handleEnablePush}
              disabled={isLoading}
              size="sm"
              className="h-7.5 px-2.5 gap-1 text-[11px] font-semibold rounded-xl bg-gradient-to-r from-[#FF5E3A] to-[#FF3366] text-white border-0 cursor-pointer"
            >
              {isLoading ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Check className="h-3 w-3" />
              )}
              <span>Enable Push</span>
            </Button>
          ) : null}
        </div>
      </div>

      {/* iOS Safari Add to Home Screen Guide */}
      {showIOSGuide && (
        <div className="p-3.5 rounded-2xl border border-primary/25 bg-primary/[0.04] dark:bg-primary/[0.08] space-y-2 text-xs animate-in fade-in-50 duration-150">
          <div className="flex items-center justify-between">
            <p className="font-bold text-foreground flex items-center gap-1.5">
              <Smartphone className="h-3.5 w-3.5 text-primary" />
              Enable Lock-Screen Push on iOS (iPhone / iPad)
            </p>
            <button
              onClick={() => setShowIOSGuide(false)}
              className="text-[11px] text-muted-foreground hover:text-foreground font-medium"
            >
              Hide
            </button>
          </div>
          <p className="text-muted-foreground leading-relaxed text-[11px]">
            In-app real-time alerts and sound work automatically right now! For Apple lock-screen push notifications when Safari is closed:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-0.5">
            <div className="flex items-center gap-2 p-2 rounded-xl bg-card border border-border/70">
              <div className="h-6 w-6 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Share className="h-3.5 w-3.5" />
              </div>
              <span className="text-[11px] font-medium">
                1. Tap the <strong>Share</strong> button in Safari
              </span>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-xl bg-card border border-border/70">
              <div className="h-6 w-6 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <PlusSquare className="h-3.5 w-3.5" />
              </div>
              <span className="text-[11px] font-medium">
                2. Select <strong>Add to Home Screen</strong> &amp; open Mingle
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Expandable Granular Push Channels Section */}
      {showPreferences && (
        <div className="p-3.5 rounded-2xl border border-border/80 bg-card shadow-xs animate-in fade-in-50 duration-150">
          <PushPreferencesCard showTitle={false} />
        </div>
      )}
    </div>
  );
}
