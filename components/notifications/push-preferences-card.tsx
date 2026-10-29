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

  const handleToggle = async (
    key: keyof PushNotificationPreferences,
    nextVal: boolean
  ) => {
    const prev = { ...preferences };
    const updated = { ...preferences, [key]: nextVal };

    setPreferences(updated);

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

      const titles: Record<keyof PushNotificationPreferences, string> = {
        enabled: "All push notifications",
        likes: "Like alerts",
        comments: "Comment alerts",
        chats: "Chat alerts",
        events: "Event alerts",
      };

      if (nextVal) {
        toast.success(`${titles[key]} enabled`);
      } else {
        toast.info(`${titles[key]} muted`);
      }
    } catch (err: any) {
      setPreferences(prev);
      toast.error(err.message || "Could not save preference");
    }
  };

  if (isLoading) {
    return (
      <div className="p-4 rounded-xl border bg-card/60 flex items-center justify-center gap-2 text-xs text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
        Loading channels...
      </div>
    );
  }

  const allActive =
    preferences.enabled &&
    preferences.likes &&
    preferences.comments &&
    preferences.chats &&
    preferences.events;

  const channelItems: {
    key: keyof PushNotificationPreferences;
    label: string;
    icon: React.ReactNode;
    iconBg: string;
  }[] = [
    {
      key: "likes",
      label: "Likes & Reactions",
      icon: <Heart className="h-3.5 w-3.5 fill-rose-500/20" />,
      iconBg: "bg-rose-500/10 text-rose-500",
    },
    {
      key: "comments",
      label: "Comments & Replies",
      icon: <MessageCircle className="h-3.5 w-3.5 fill-amber-500/20" />,
      iconBg: "bg-amber-500/10 text-amber-500",
    },
    {
      key: "chats",
      label: "Messages & Chats",
      icon: <MessageSquare className="h-3.5 w-3.5" />,
      iconBg: "bg-blue-500/10 text-blue-500",
    },
    {
      key: "events",
      label: "Event Joins & Updates",
      icon: <CalendarDays className="h-3.5 w-3.5" />,
      iconBg: "bg-emerald-500/10 text-emerald-500",
    },
  ];

  return (
    <div className={`space-y-2.5 ${className}`}>
      {showTitle && (
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-bold flex items-center gap-1.5 text-foreground">
            <Sliders className="h-3.5 w-3.5 text-primary" />
            Notification Channels
          </h3>
          <Badge
            variant="outline"
            className={`text-[10px] px-2 py-0.5 rounded-full ${
              !preferences.enabled
                ? "border-muted-foreground/30 text-muted-foreground bg-muted/40"
                : allActive
                ? "border-emerald-500/40 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10"
                : "border-primary/40 text-primary bg-primary/10"
            }`}
          >
            {!preferences.enabled ? "Muted" : allActive ? "All Active" : "Custom"}
          </Badge>
        </div>
      )}

      {/* Master Push Toggle */}
      <div className="flex items-center justify-between p-2.5 rounded-xl border border-border/80 bg-muted/30">
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className={`h-7 w-7 rounded-lg flex items-center justify-center shrink-0 ${
              preferences.enabled
                ? "bg-primary/15 text-primary"
                : "bg-muted text-muted-foreground"
            }`}
          >
            <Bell className="h-3.5 w-3.5" />
          </div>
          <span className="font-semibold text-xs text-foreground truncate">
            All Push Notifications
          </span>
        </div>

        <Switch
          checked={preferences.enabled}
          onCheckedChange={(checked: boolean) => handleToggle("enabled", checked)}
          aria-label="Toggle all push notifications"
        />
      </div>

      {/* Compact 2-Column Category Grid */}
      <div
        className={`grid grid-cols-1 sm:grid-cols-2 gap-2 transition-opacity ${
          !preferences.enabled ? "opacity-50 pointer-events-none select-none" : ""
        }`}
      >
        {channelItems.map((item) => (
          <div
            key={item.key}
            className="flex items-center justify-between p-2.5 rounded-xl border border-border/70 bg-card"
          >
            <div className="flex items-center gap-2 min-w-0 pr-2">
              <div
                className={`h-7 w-7 rounded-lg flex items-center justify-center shrink-0 ${item.iconBg}`}
              >
                {item.icon}
              </div>
              <span className="font-medium text-xs text-foreground truncate">
                {item.label}
              </span>
            </div>
            <Switch
              checked={preferences[item.key]}
              onCheckedChange={(checked: boolean) =>
                handleToggle(item.key, checked)
              }
              aria-label={`Toggle ${item.label}`}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
