"use client";

import { useState, useEffect } from "react";
import { requestPushPermissionAndGetToken, disablePushNotifications } from "@/lib/firebase/client";
import { Bell, BellOff, Check, Loader2, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export function PushNotificationBanner() {
  const [permissionState, setPermissionState] = useState<NotificationPermission | "unsupported" | "disabled">("default");
  const [isLoading, setIsLoading] = useState(false);

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
      toast.error("Could not obtain push token. Check your .env.local configuration.");
    }
  }

  async function handleDisablePush() {
    setIsLoading(true);
    const ok = await disablePushNotifications();
    setIsLoading(false);

    if (ok) {
      setPermissionState("disabled");
      toast.success("Push notifications disabled for this account.");
    } else {
      toast.error("Failed to disable push notifications.");
    }
  }

  if (permissionState === "unsupported") {
    return null;
  }

  if (permissionState === "granted") {
    return (
      <div className="bg-emerald-950/20 border border-emerald-800/40 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 mb-6">
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
              You are receiving live alerts for event group chats, messages, and activity.
            </p>
          </div>
        </div>
        <Button
          onClick={handleDisablePush}
          disabled={isLoading}
          variant="outline"
          size="sm"
          className="shrink-0 gap-2 border-emerald-700/50 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/40"
        >
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <BellOff className="h-4 w-4" />}
          Disable Push Notifications
        </Button>
      </div>
    );
  }

  return (
    <div className="bg-primary/10 border border-primary/20 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 mb-6">
      <div className="flex items-center gap-3 text-left">
        <div className="h-10 w-10 bg-primary/20 rounded-xl flex items-center justify-center text-primary shrink-0">
          <Bell className="h-5 w-5" />
        </div>
        <div>
          <h4 className="font-bold text-sm">
            {permissionState === "disabled" ? "Push Notifications Disabled" : "Enable Live Push Notifications"}
          </h4>
          <p className="text-xs text-muted-foreground mt-0.5">
            {permissionState === "denied"
              ? "Browser notification permission is blocked. Reset permission in browser address bar settings to re-enable."
              : "Get instant alerts when someone messages your event group chat or interacts with you."}
          </p>
        </div>
      </div>
      {permissionState === "denied" ? (
        <Badge variant="outline" className="gap-1 border-amber-500/40 text-amber-400 py-1 shrink-0">
          <ShieldAlert className="h-3.5 w-3.5" /> Blocked in Browser
        </Badge>
      ) : (
        <Button onClick={handleEnablePush} disabled={isLoading} size="sm" className="shrink-0 gap-2">
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          Enable Notifications
        </Button>
      )}
    </div>
  );
}
