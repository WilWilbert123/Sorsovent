"use client";

import { useState, useEffect } from "react";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Bell,
  Heart,
  MessageCircle,
  MessageSquare,
  CalendarDays,
  Loader2,
  CheckCircle2,
  Sliders,
} from "lucide-react";
import { toast } from "sonner";

export interface PushNotificationPreferences {
  enabled: boolean;
  likes: boolean;
  comments: boolean;
  chats: boolean;
  events: boolean;
}

const defaultPreferences: PushNotificationPreferences = {
  enabled: true,
  likes: true,
  comments: true,
  chats: true,
  events: true,
};

interface PushPreferencesCardProps {
  className?: string;
  showTitle?: boolean;
}

export function PushPreferencesCard({
  className = "",
  showTitle = true,
}: PushPreferencesCardProps) {
  const [preferences, setPreferences] =
    useState<PushNotificationPreferences>(defaultPreferences);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  // Load user's preferences
  useEffect(() => {
    let isMounted = true;
    async function loadPreferences() {
      try {
        const res = await fetch("/api/notifications/preferences");
        const json = await res.json();
        if (json.success && json.preferences && isMounted) {
          setPreferences(json.preferences);
        }
      } catch (err) {
        console.error("Failed to load notification preferences:", err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    loadPreferences();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleToggle = async (key: keyof PushNotificationPreferences, nextVal: boolean) => {
    const prev = { ...preferences };
    const updated = { ...preferences, [key]: nextVal };

    // Optimistic UI update
    setPreferences(updated);
    setIsUpdating(true);

    try {
      const res = await fetch("/api/notifications/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [key]: nextVal }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to update preference");
      }

      // Friendly notification toasts
      const titles: Record<keyof PushNotificationPreferences, string> = {
        enabled: "All push notifications",
        likes: "Post like alerts",
        comments: "Comment alerts",
        chats: "Group chat & message alerts",
        events: "Event join alerts",
      };

      if (nextVal) {
        toast.success(`${titles[key]} enabled 🔔`);
      } else {
        toast.info(`${titles[key]} turned off 🔕`);
      }
    } catch (err: any) {
      setPreferences(prev);
      toast.error(err.message || "Could not save preference");
    } finally {
      setIsUpdating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 rounded-2xl border bg-card/60 flex items-center justify-center gap-2 text-xs text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin text-primary" />
        Loading notification channels...
      </div>
    );
  }

  const allActive =
    preferences.enabled &&
    preferences.likes &&
    preferences.comments &&
    preferences.chats &&
    preferences.events;

  const anyDisabled =
    !preferences.enabled ||
    !preferences.likes ||
    !preferences.comments ||
    !preferences.chats ||
    !preferences.events;

  return (
    <div className={`space-y-4 ${className}`}>
      {showTitle && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1">
          <div>
            <h3 className="text-sm sm:text-base font-bold flex items-center gap-2 text-foreground">
              <Sliders className="h-4 w-4 text-primary" />
              Push Notification Preferences
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Customize which live alerts you receive on this device
            </p>
          </div>
          <Badge
            variant="outline"
            className={`self-start sm:self-auto text-[11px] px-2 py-0.5 rounded-full ${
              !preferences.enabled
                ? "border-muted-foreground/30 text-muted-foreground bg-muted/40"
                : allActive
                ? "border-emerald-500/40 text-emerald-500 bg-emerald-500/10 font-medium"
                : "border-primary/40 text-primary bg-primary/10 font-medium"
            }`}
          >
            {!preferences.enabled
              ? "All Muted 🔕"
              : allActive
              ? "All Active 🟢"
              : "Customized ⚙️"}
          </Badge>
        </div>
      )}

      {/* 1. Master Push Toggle */}
      <div
        className={`flex items-center justify-between p-3.5 sm:p-4 rounded-2xl border transition-all ${
          preferences.enabled
            ? "bg-primary/5 border-primary/30 shadow-2xs"
            : "bg-muted/30 border-border/80 opacity-90"
        }`}
      >
        <div className="flex items-center gap-3 min-w-0 pr-3">
          <div
            className={`h-9 w-9 sm:h-10 sm:w-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
              preferences.enabled
                ? "bg-primary/20 text-primary"
                : "bg-muted text-muted-foreground"
            }`}
          >
            <Bell className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <p className="font-semibold text-sm text-foreground">
                All Push Notifications
              </p>
              <span className="text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-1.5 py-0.2 rounded">
                Master Switch
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5 leading-snug">
              Master control for all live push alerts across Mingle
            </p>
          </div>
        </div>

        <Switch
          checked={preferences.enabled}
          onCheckedChange={(checked: boolean) => handleToggle("enabled", checked)}
          aria-label="Toggle all push notifications"
        />
      </div>

      {/* 2. Granular Category Switches */}
      <div
        className={`space-y-2.5 transition-all ${
          !preferences.enabled ? "opacity-50 pointer-events-none select-none" : ""
        }`}
      >
        {/* Post Likes */}
        <div className="flex items-center justify-between p-3 sm:p-3.5 rounded-xl border border-border/80 bg-card hover:border-primary/30 transition-all">
          <div className="flex items-center gap-3 min-w-0 pr-3">
            <div className="h-8 w-8 rounded-lg bg-rose-500/10 text-rose-500 flex items-center justify-center shrink-0">
              <Heart className="h-4 w-4 fill-rose-500/30" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-xs sm:text-sm text-foreground">
                Post Likes & Reactions
              </p>
              <p className="text-[11px] sm:text-xs text-muted-foreground leading-snug">
                Receive push alerts when someone reacts to your posts
              </p>
            </div>
          </div>
          <Switch
            checked={preferences.likes}
            onCheckedChange={(checked: boolean) => handleToggle("likes", checked)}
            aria-label="Toggle post like push notifications"
          />
        </div>

        {/* Post Comments */}
        <div className="flex items-center justify-between p-3 sm:p-3.5 rounded-xl border border-border/80 bg-card hover:border-primary/30 transition-all">
          <div className="flex items-center gap-3 min-w-0 pr-3">
            <div className="h-8 w-8 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
              <MessageCircle className="h-4 w-4 fill-amber-500/20" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-xs sm:text-sm text-foreground">
                Post Comments
              </p>
              <p className="text-[11px] sm:text-xs text-muted-foreground leading-snug">
                Receive push alerts when someone comments on your posts
              </p>
            </div>
          </div>
          <Switch
            checked={preferences.comments}
            onCheckedChange={(checked: boolean) => handleToggle("comments", checked)}
            aria-label="Toggle comment push notifications"
          />
        </div>

        {/* Event Group Chats & Messages */}
        <div className="flex items-center justify-between p-3 sm:p-3.5 rounded-xl border border-border/80 bg-card hover:border-primary/30 transition-all">
          <div className="flex items-center gap-3 min-w-0 pr-3">
            <div className="h-8 w-8 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
              <MessageSquare className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-xs sm:text-sm text-foreground">
                Event Group Chats & Messages
              </p>
              <p className="text-[11px] sm:text-xs text-muted-foreground leading-snug">
                Receive push alerts when members send messages in joined event chats
              </p>
            </div>
          </div>
          <Switch
            checked={preferences.chats}
            onCheckedChange={(checked: boolean) => handleToggle("chats", checked)}
            aria-label="Toggle chat push notifications"
          />
        </div>

        {/* Event Joins & RSVPs */}
        <div className="flex items-center justify-between p-3 sm:p-3.5 rounded-xl border border-border/80 bg-card hover:border-primary/30 transition-all">
          <div className="flex items-center gap-3 min-w-0 pr-3">
            <div className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
              <CalendarDays className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-xs sm:text-sm text-foreground">
                Event Joins & Attendee Updates
              </p>
              <p className="text-[11px] sm:text-xs text-muted-foreground leading-snug">
                Receive push alerts when someone joins your events
              </p>
            </div>
          </div>
          <Switch
            checked={preferences.events}
            onCheckedChange={(checked: boolean) => handleToggle("events", checked)}
            aria-label="Toggle event join push notifications"
          />
        </div>
      </div>
    </div>
  );
}
