"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Bell,
  BellOff,
  MessageSquare,
  Users,
  Heart,
  MessageCircle,
  UserPlus,
  CheckCheck,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PushNotificationBanner } from "@/components/notifications/push-notification-banner";
import { safeFormatDate } from "@/lib/utils";
import Link from "next/link";
import { toast } from "sonner";

interface NotificationItem {
  id: string;
  user_id: string;
  actor_id: string;
  type: string;
  event_id?: string | null;
  post_id?: string | null;
  is_read: boolean;
  created_at: string;
  actor?: {
    id: string;
    display_name?: string | null;
    full_name?: string | null;
    username?: string | null;
    avatar_url?: string | null;
  } | null;
  event?: {
    id: string;
    title: string;
    category?: string | null;
  } | null;
}

interface NotificationsViewProps {
  initialNotifications: NotificationItem[];
  currentUserId: string;
}

export function NotificationsView({
  initialNotifications = [],
  currentUserId,
}: NotificationsViewProps) {
  const [notifications, setNotifications] =
    useState<NotificationItem[]>(initialNotifications);

  // Subscribe to real-time notification updates
  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel(`user-notifications:${currentUserId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${currentUserId}`,
        },
        async (payload) => {
          const newNotif = payload.new as NotificationItem;

          // Fetch actor details
          const { data: actor } = await supabase
            .from("profiles")
            .select("id, display_name, full_name, username, avatar_url")
            .eq("id", newNotif.actor_id)
            .single();

          let eventData = null;
          if (newNotif.event_id) {
            const { data: ev } = await supabase
              .from("events")
              .select("id, title, category")
              .eq("id", newNotif.event_id)
              .single();
            eventData = ev;
          }

          const fullNotif = {
            ...newNotif,
            actor,
            event: eventData,
          };

          setNotifications((prev) => [fullNotif, ...prev]);

          // Show real-time toast banner
          const actorName =
            actor?.full_name || actor?.display_name || actor?.username || "Someone";
          toast.info(`🔔 ${actorName} sent a notification`, {
            description: eventData?.title ? `Event: ${eventData.title}` : "New activity on Sorsovent",
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId]);

  const markAllAsRead = async () => {
    const supabase = createClient();
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", currentUserId)
      .eq("is_read", false);
    toast.success("All notifications marked as read");
  };

  const markSingleAsRead = async (notifId: string) => {
    const supabase = createClient();
    setNotifications((prev) =>
      prev.map((n) => (n.id === notifId ? { ...n, is_read: true } : n))
    );
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", notifId);
  };

  const deleteSingleNotification = async (e: React.MouseEvent, notifId: string) => {
    e.preventDefault();
    e.stopPropagation();

    const supabase = createClient();
    setNotifications((prev) => prev.filter((n) => n.id !== notifId));

    const { error } = await supabase
      .from("notifications")
      .delete()
      .eq("id", notifId);

    if (error) {
      toast.error("Failed to delete notification");
    } else {
      toast.success("Notification removed");
    }
  };

  const clearAllNotifications = async () => {
    if (notifications.length === 0) return;
    if (!confirm("Are you sure you want to clear all notifications?")) return;

    const supabase = createClient();
    setNotifications([]);

    const { error } = await supabase
      .from("notifications")
      .delete()
      .eq("user_id", currentUserId);

    if (error) {
      toast.error("Failed to clear notifications");
    } else {
      toast.success("All notifications cleared");
    }
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <div className="max-w-3xl mx-auto px-3 sm:px-4 py-4 sm:py-6 min-h-screen flex flex-col space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
            Notifications
            {unreadCount > 0 && (
              <Badge className="bg-primary text-primary-foreground font-semibold px-2 py-0.5 rounded-full text-xs">
                {unreadCount} new
              </Badge>
            )}
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Stay updated with event messages, interactions, and updates.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 self-end sm:self-auto w-full sm:w-auto justify-end">
          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={markAllAsRead}
              className="gap-1.5 text-xs rounded-xl h-8 px-2.5 sm:px-3"
            >
              <CheckCheck className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Mark all read</span>
              <span className="sm:hidden">Read all</span>
            </Button>
          )}

          {notifications.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAllNotifications}
              className="gap-1.5 text-xs rounded-xl h-8 px-2.5 sm:px-3 text-destructive hover:bg-destructive/10 hover:text-destructive"
              title="Clear all notifications"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Clear all</span>
            </Button>
          )}
        </div>
      </div>

      {/* Push Notification Toggle Banner */}
      <PushNotificationBanner />

      {/* Notifications List */}
      {notifications.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-8 sm:p-12 border rounded-2xl bg-card shadow-xs">
          <div className="h-16 sm:h-20 w-16 sm:w-20 bg-primary/10 rounded-full flex items-center justify-center mb-4 text-primary">
            <BellOff className="h-8 sm:h-10 w-8 sm:w-10 opacity-70" />
          </div>
          <h2 className="text-lg sm:text-xl font-semibold mb-1">All caught up!</h2>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-sm mx-auto">
            You don't have any notifications right now. When someone sends an event message, interacts with your posts, or joins your event, you'll see it here in real-time.
          </p>
        </div>
      ) : (
        <div className="space-y-2 sm:space-y-3">
          {notifications.map((notif) => {
            const actorName =
              notif.actor?.full_name ||
              notif.actor?.display_name ||
              notif.actor?.username ||
              "Someone";

            let icon = <Bell className="h-3.5 w-3.5 text-primary" />;
            let text = "interacted with you";
            let targetUrl = "/notifications";

            if (notif.type === "event_chat") {
              icon = <MessageSquare className="h-3.5 w-3.5 text-blue-500" />;
              text = `sent a message in event chat`;
              targetUrl = notif.event_id ? `/events/${notif.event_id}/chat` : "/messages";
            } else if (notif.type === "event_join") {
              icon = <Users className="h-3.5 w-3.5 text-emerald-500" />;
              text = `joined your event`;
              targetUrl = notif.event_id ? `/events/${notif.event_id}` : "/events";
            } else if (notif.type === "like") {
              icon = <Heart className="h-3.5 w-3.5 text-rose-500" />;
              text = `liked your post`;
              targetUrl = notif.post_id ? `/posts/${notif.post_id}` : "/feed";
            } else if (notif.type === "comment") {
              icon = <MessageCircle className="h-3.5 w-3.5 text-amber-500" />;
              text = `commented on your post`;
              targetUrl = notif.post_id ? `/posts/${notif.post_id}` : "/feed";
            } else if (notif.type === "follow") {
              icon = <UserPlus className="h-3.5 w-3.5 text-purple-500" />;
              text = `started following you`;
              targetUrl = notif.actor?.username ? `/profile/${notif.actor.username}` : "/explore";
            }

            const timeFormatted = safeFormatDate(notif.created_at, "MMM d, h:mm a");

            return (
              <div key={notif.id} className="relative group">
                <Link
                  href={targetUrl}
                  onClick={() => markSingleAsRead(notif.id)}
                  className="block"
                >
                  <div
                    className={`flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-2xl border transition-all hover:shadow-xs ${
                      !notif.is_read
                        ? "bg-primary/5 border-primary/30"
                        : "bg-card border-border/80 opacity-90"
                    }`}
                  >
                    {/* Actor Avatar */}
                    <div className="relative shrink-0">
                      <Avatar className="w-9 h-9 sm:w-11 sm:h-11 border">
                        <AvatarImage src={notif.actor?.avatar_url || undefined} alt={actorName} />
                        <AvatarFallback className="font-bold text-xs bg-primary/10 text-primary">
                          {actorName[0]?.toUpperCase() || "U"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="absolute -bottom-1 -right-1 p-0.5 sm:p-1 bg-card rounded-full border shadow-2xs">
                        {icon}
                      </div>
                    </div>

                    {/* Notification Content */}
                    <div className="flex-1 min-w-0 pr-6">
                      <div className="flex items-center justify-between gap-1.5 mb-0.5">
                        <p className="text-xs sm:text-sm text-foreground leading-snug line-clamp-2">
                          <strong className="font-semibold text-foreground">{actorName}</strong>{" "}
                          <span className="text-muted-foreground">{text}</span>
                          {notif.event?.title && (
                            <strong className="text-primary font-medium ml-1">
                              "{notif.event.title}"
                            </strong>
                          )}
                        </p>

                        {!notif.is_read && (
                          <span className="w-2 h-2 rounded-full bg-primary shrink-0 animate-pulse" />
                        )}
                      </div>
                      <span className="text-[10px] sm:text-[11px] text-muted-foreground">
                        {timeFormatted}
                      </span>
                    </div>
                  </div>
                </Link>

                {/* Delete Single Notification Button */}
                <button
                  onClick={(e) => deleteSingleNotification(e, notif.id)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 rounded-full text-muted-foreground/60 hover:text-destructive hover:bg-destructive/10 transition-all opacity-80 sm:opacity-0 group-hover:opacity-100 z-10"
                  title="Remove notification"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
