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
  CornerDownRight,
  CheckCheck,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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
  post?: {
    id: string;
    content: string;
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
  const [filter, setFilter] = useState<"all" | "unread">("all");

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

          const { data: actor } = await supabase
            .from("profiles")
            .select("id, display_name, full_name, username, avatar_url")
            .eq("id", newNotif.actor_id)
            .maybeSingle();

          let eventData = null;
          if (newNotif.event_id) {
            const { data: ev } = await supabase
              .from("events")
              .select("id, title, category")
              .eq("id", newNotif.event_id)
              .maybeSingle();
            eventData = ev;
          }

          let postData = null;
          if (newNotif.post_id) {
            const { data: p } = await supabase
              .from("posts")
              .select("id, content")
              .eq("id", newNotif.post_id)
              .maybeSingle();
            postData = p;
          }

          const fullNotif: NotificationItem = {
            ...newNotif,
            actor,
            event: eventData,
            post: postData,
          };

          setNotifications((prev) => [
            fullNotif,
            ...prev.filter((n) => n.id !== fullNotif.id),
          ]);

          const actorName =
            actor?.full_name || actor?.display_name || actor?.username || "Someone";
          let desc = "New activity on Mingle";
          if (newNotif.type === "like") {
            desc = "Liked your post ❤️";
          } else if (newNotif.type === "comment") {
            desc = "Commented on your post 💬";
          } else if (newNotif.type === "reply") {
            desc = "Replied to your comment 💬";
          } else if (newNotif.type === "comment_like") {
            desc = "Liked your comment ❤️";
          } else if (newNotif.type === "event_join") {
            desc = "Joined your event 🎉";
          } else if (newNotif.type === "direct_message") {
            desc = "Sent you a message 💬";
          } else if (eventData?.title) {
            desc = `Event: ${eventData.title}`;
          }

          toast.info(`🔔 ${actorName}`, {
            description: desc,
          });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${currentUserId}`,
        },
        (payload) => {
          const deletedId = (payload.old as any)?.id;
          if (deletedId) {
            setNotifications((prev) => prev.filter((n) => n.id !== deletedId));
          }
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

  const deleteSingleNotification = async (
    e: React.MouseEvent,
    notifId: string
  ) => {
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
    }
  };

  const clearAllNotifications = async () => {
    if (notifications.length === 0) return;
    if (!confirm("Clear all notifications?")) return;

    const supabase = createClient();
    setNotifications([]);

    const { error } = await supabase
      .from("notifications")
      .delete()
      .eq("user_id", currentUserId);

    if (error) {
      toast.error("Failed to clear notifications");
    } else {
      toast.success("Notifications cleared");
    }
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;
  const displayedNotifications =
    filter === "unread"
      ? notifications.filter((n) => !n.is_read)
      : notifications;

  return (
    <div className="max-w-2xl mx-auto px-3.5 sm:px-4 py-3.5 sm:py-6 flex flex-col space-y-3.5">
      {/* Compact Single-Row Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h1 className="text-lg sm:text-xl font-bold tracking-tight">
            Notifications
          </h1>
          {unreadCount > 0 && (
            <span className="bg-primary text-primary-foreground font-bold px-2 py-0.5 rounded-full text-[11px]">
              {unreadCount}
            </span>
          )}
        </div>

        {/* Inline Action Controls */}
        <div className="flex items-center gap-1.5">
          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={markAllAsRead}
              className="gap-1 text-xs rounded-lg h-7.5 px-2.5 cursor-pointer"
            >
              <CheckCheck className="h-3.5 w-3.5" />
              <span>Read all</span>
            </Button>
          )}

          {notifications.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAllNotifications}
              className="gap-1 text-xs rounded-lg h-7.5 px-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive cursor-pointer"
              title="Clear all notifications"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Clear</span>
            </Button>
          )}
        </div>
      </div>

      {/* Compact Push Status Bar */}
      <PushNotificationBanner />

      {/* Filter Pills */}
      {notifications.length > 0 && (
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setFilter("all")}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
              filter === "all"
                ? "bg-foreground text-background shadow-2xs"
                : "bg-card text-muted-foreground hover:text-foreground border border-border/70"
            }`}
          >
            All ({notifications.length})
          </button>
          <button
            onClick={() => setFilter("unread")}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
              filter === "unread"
                ? "bg-primary text-primary-foreground shadow-2xs"
                : "bg-card text-muted-foreground hover:text-foreground border border-border/70"
            }`}
          >
            Unread ({unreadCount})
          </button>
        </div>
      )}

      {/* Notifications List */}
      {displayedNotifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center py-12 px-6 border border-dashed rounded-2xl bg-card/50">
          <div className="h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center mb-3 text-primary">
            <BellOff className="h-5 w-5 opacity-75" />
          </div>
          <h2 className="text-sm font-semibold">
            {filter === "unread" ? "No unread alerts" : "No notifications yet"}
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {filter === "unread"
              ? "You've read all your recent notifications."
              : "New messages, likes, and event updates will appear here."}
          </p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {displayedNotifications.map((notif) => {
            const actorName =
              notif.actor?.full_name ||
              notif.actor?.display_name ||
              notif.actor?.username ||
              "Someone";

            let icon = <Bell className="h-3 w-3 text-primary" />;
            let text = "interacted with you";
            let targetUrl = "/notifications";

            if (notif.type === "event_chat") {
              icon = <MessageSquare className="h-3 w-3 text-blue-500" />;
              text = "sent a message in event chat";
              targetUrl = notif.event_id
                ? `/events/${notif.event_id}/chat`
                : "/messages";
            } else if (notif.type === "event_join") {
              icon = <Users className="h-3 w-3 text-emerald-500" />;
              text = "joined your event";
              targetUrl = notif.event_id
                ? `/events/${notif.event_id}`
                : "/events";
            } else if (notif.type === "like") {
              icon = (
                <Heart className="h-3 w-3 text-rose-500 fill-rose-500" />
              );
              text = "liked your post";
              targetUrl = notif.post_id
                ? `/home#post-${notif.post_id}`
                : "/home";
            } else if (notif.type === "comment") {
              icon = (
                <MessageCircle className="h-3 w-3 text-amber-500 fill-amber-500/20" />
              );
              text = "commented on your post";
              targetUrl = notif.post_id
                ? `/home#post-${notif.post_id}`
                : "/home";
            } else if (notif.type === "reply") {
              icon = <CornerDownRight className="h-3 w-3 text-blue-500" />;
              text = "replied to your comment";
              targetUrl = notif.post_id
                ? `/home#post-${notif.post_id}`
                : "/home";
            } else if (notif.type === "comment_like") {
              icon = (
                <Heart className="h-3 w-3 text-rose-500 fill-rose-500" />
              );
              text = "liked your comment";
              targetUrl = notif.post_id
                ? `/home#post-${notif.post_id}`
                : "/home";
            } else if (notif.type === "follow") {
              icon = <UserPlus className="h-3 w-3 text-purple-500" />;
              text = "started following you";
              targetUrl = notif.actor?.username
                ? `/profile/${notif.actor.username}`
                : "/explore";
            } else if (notif.type === "direct_message") {
              icon = <MessageSquare className="h-3 w-3 text-rose-500" />;
              text = "sent you a direct message";
              targetUrl = "/messages?tab=direct";
            }

            const timeFormatted = safeFormatDate(
              notif.created_at,
              "MMM d, h:mm a"
            );

            return (
              <div key={notif.id} className="relative group">
                <Link
                  href={targetUrl}
                  onClick={() => markSingleAsRead(notif.id)}
                  className="block"
                >
                  <div
                    className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                      !notif.is_read
                        ? "bg-primary/[0.04] dark:bg-primary/[0.08] border-primary/25 shadow-2xs"
                        : "bg-card border-border/70 opacity-85 hover:opacity-100"
                    }`}
                  >
                    {/* Actor Avatar */}
                    <div className="relative shrink-0">
                      <Avatar className="w-10 h-10 border border-border/60">
                        <AvatarImage
                          src={notif.actor?.avatar_url || undefined}
                          alt={actorName}
                        />
                        <AvatarFallback className="font-bold text-xs bg-primary/10 text-primary">
                          {actorName[0]?.toUpperCase() || "U"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="absolute -bottom-0.5 -right-0.5 p-1 bg-card rounded-full border border-border/80 shadow-2xs">
                        {icon}
                      </div>
                    </div>

                    {/* Notification Content */}
                    <div className="flex-1 min-w-0 pr-7">
                      <p className="text-xs sm:text-sm text-foreground leading-snug line-clamp-2">
                        <span className="font-semibold text-foreground">
                          {actorName}
                        </span>{" "}
                        <span className="text-muted-foreground">{text}</span>
                        {notif.event?.title && (
                          <span className="text-primary font-medium ml-1">
                            &ldquo;{notif.event.title}&rdquo;
                          </span>
                        )}
                      </p>

                      {notif.post?.content && (
                        <p className="text-[11px] text-muted-foreground line-clamp-1 my-0.5 border-l-2 border-primary/30 pl-2">
                          {notif.post.content}
                        </p>
                      )}

                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[11px] text-muted-foreground">
                          {timeFormatted}
                        </span>
                        {!notif.is_read && (
                          <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                        )}
                      </div>
                    </div>
                  </div>
                </Link>

                {/* Dismiss Button */}
                <button
                  onClick={(e) => deleteSingleNotification(e, notif.id)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-muted-foreground/60 hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer z-10"
                  title="Remove notification"
                  aria-label="Remove notification"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
