"use client";

import { useState, useEffect } from "react";
import { requestPushPermissionAndGetToken, disablePushNotifications } from "@/lib/firebase/client";
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
      setShowPreferences(true);
      toast.success("Push notifications enabled!");
    } else if (Notification.permission === "denied") {
      setPermissionState("denied");
      toast.error("Push permission was blocked in your browser settings.");
    } else {
      toast.error("Could not obtain push token. Check your .env.local configuration.");
    }
  }

  async function handleDisablePush() {
    setIsLoading(true);
    const ok = await disablePushNotifications();
    setIsLoading(false);

    if (ok) {
      setPermissionState("disabled");
      toast.success("Push notifications disabled for this device.");
    } else {
      toast.error("Failed to disable push notifications.");
    }
  }

  if (permissionState === "unsupported") {
    return null;
  }

  return (
    <div className="space-y-4 mb-6">
      {permissionState === "granted" ? (
        <div className="bg-emerald-950/20 border border-emerald-800/40 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-3 text-left">
            <div className="h-10 w-10 bg-emerald-500/20 rounded-xl flex items-center justify-center text-emerald-400 shrink-0">
              <Bell className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-bold text-sm">Push Notifications Active</h4>
                <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/40 text-[10px]">
                  Active 🟢
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                You can select which push notifications you want (likes, comments, chats, events).
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0 w-full sm:w-auto justify-end">
            <Button
              onClick={() => setShowPreferences((prev) => !prev)}
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs rounded-xl h-8 px-3 border-emerald-700/50 hover:bg-emerald-500/10 cursor-pointer"
            >
              <Sliders className="h-3.5 w-3.5" />
              <span>{showPreferences ? "Hide Channels" : "Select Alerts"}</span>
              {showPreferences ? (
                <ChevronUp className="h-3 w-3 ml-0.5 opacity-60" />
              ) : (
                <ChevronDown className="h-3 w-3 ml-0.5 opacity-60" />
              )}
            </Button>

            <Button
              onClick={handleDisablePush}
              disabled={isLoading}
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs rounded-xl h-8 px-3 border-emerald-700/50 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/40 cursor-pointer"
            >
              {isLoading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <BellOff className="h-3.5 w-3.5" />
              )}
              <span>Mute All</span>
            </Button>
          </div>
        </div>
      ) : (
        <div className="bg-primary/10 border border-primary/20 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3 text-left">
            <div className="h-10 w-10 bg-primary/20 rounded-xl flex items-center justify-center text-primary shrink-0">
              <Bell className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-bold text-sm">
                  {permissionState === "disabled"
                    ? "Push Notifications Muted"
                    : "Enable Live Push Notifications"}
                </h4>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {permissionState === "denied"
                  ? "Browser notification permission is blocked. Reset permission in your browser address bar to re-enable."
                  : "Receive instant alerts when someone likes or comments on your posts, or messages your event."}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0 w-full sm:w-auto justify-end">
            <Button
              onClick={() => setShowPreferences((prev) => !prev)}
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs rounded-xl h-8 px-3 cursor-pointer"
            >
              <Sliders className="h-3.5 w-3.5" />
              <span>{showPreferences ? "Hide Channels" : "Select Alerts"}</span>
              {showPreferences ? (
                <ChevronUp className="h-3 w-3 ml-0.5 opacity-60" />
              ) : (
                <ChevronDown className="h-3 w-3 ml-0.5 opacity-60" />
              )}
            </Button>

            {permissionState === "denied" ? (
              <Badge
                variant="outline"
                className="gap-1 border-amber-500/40 text-amber-400 py-1 shrink-0 text-xs"
              >
                <ShieldAlert className="h-3.5 w-3.5" /> Blocked in Browser
              </Badge>
            ) : (
              <Button
                onClick={handleEnablePush}
                disabled={isLoading}
                size="sm"
                className="gap-1.5 text-xs rounded-xl h-8 px-3 cursor-pointer"
              >
                {isLoading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Check className="h-3.5 w-3.5" />
                )}
                <span>Turn On Push</span>
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Expandable Granular Push Channels Section */}
      {showPreferences && (
        <div className="p-4 sm:p-5 rounded-2xl border border-border/80 bg-card/95 shadow-sm transition-all animate-in fade-in-50 duration-200">
          <PushPreferencesCard showTitle />
        </div>
      )}
    </div>
  );
}

