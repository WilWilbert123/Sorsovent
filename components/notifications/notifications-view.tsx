"use client";

import { useState, useEffect, useCallback } from "react";
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
  RefreshCw,
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

function notifyAppShellBadgeSync() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("mingle:notifications-updated"));
  }
}

export function NotificationsView({
  initialNotifications = [],
  currentUserId,
}: NotificationsViewProps) {
  const [notifications, setNotifications] =
    useState<NotificationItem[]>(initialNotifications);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchLatestNotifications = useCallback(async () => {
    const supabase = createClient();
    const { data: rawNotifs } = await supabase
      .from("notifications")
      .select(
        `
        id,
        user_id,
        actor_id,
        type,
        event_id,
        post_id,
        is_read,
        created_at,
        actor:profiles!notifications_actor_id_fkey (id, display_name, full_name, username, avatar_url),
        event:events (id, title, category),
        post:posts (id, content)
      `
      )
      .eq("user_id", currentUserId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (rawNotifs) {
      const formatted: NotificationItem[] = rawNotifs.map((n: any) => ({
        id: n.id,
        user_id: n.user_id,
        actor_id: n.actor_id,
        type: n.type,
        event_id: n.event_id,
        post_id: n.post_id,
        is_read: n.is_read,
        created_at: n.created_at,
        actor: Array.isArray(n.actor) ? n.actor[0] : n.actor,
        event: Array.isArray(n.event) ? n.event[0] : n.event,
        post: Array.isArray(n.post) ? n.post[0] : n.post,
      }));
      setNotifications(formatted);
      notifyAppShellBadgeSync();
    }
  }, [currentUserId]);

  useEffect(() => {
    // Immediate sync on mount so switching to the Alerts tab always shows fresh notifications
    fetchLatestNotifications();

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

          const [actorRes, eventRes, postRes] = await Promise.all([
            supabase
              .from("profiles")
              .select("id, display_name, full_name, username, avatar_url")
              .eq("id", newNotif.actor_id)
              .maybeSingle(),
            newNotif.event_id
              ? supabase
                  .from("events")
                  .select("id, title, category")
                  .eq("id", newNotif.event_id)
                  .maybeSingle()
              : Promise.resolve({ data: null }),
            newNotif.post_id
              ? supabase
                  .from("posts")
                  .select("id, content")
                  .eq("id", newNotif.post_id)
                  .maybeSingle()
              : Promise.resolve({ data: null }),
          ]);

          const fullNotif: NotificationItem = {
            ...newNotif,
            actor: actorRes.data,
            event: eventRes.data,
            post: postRes.data,
          };

          setNotifications((prev) => [
            fullNotif,
            ...prev.filter((n) => n.id !== fullNotif.id),
          ]);
          notifyAppShellBadgeSync();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${currentUserId}`,
        },
        (payload) => {
          const updated = payload.new as NotificationItem;
          if (updated?.id) {
            setNotifications((prev) =>
              prev.map((n) =>
                n.id === updated.id ? { ...n, is_read: updated.is_read } : n
              )
            );
            notifyAppShellBadgeSync();
          }
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
            notifyAppShellBadgeSync();
          }
        }
      )
      .subscribe();

    const handleVisibility = () => {
      if (!document.hidden) {
        fetchLatestNotifications();
      }
    };

    const handleRealtimeNotif = () => {
      fetchLatestNotifications();
    };

    const pollInterval = setInterval(() => {
      if (typeof document !== "undefined" && !document.hidden) {
        fetchLatestNotifications();
      }
    }, 5000);

    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("mingle:realtime-notification", handleRealtimeNotif);

    return () => {
      clearInterval(pollInterval);
      supabase.removeChannel(channel);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener(
        "mingle:realtime-notification",
        handleRealtimeNotif
      );
    };
  }, [currentUserId, fetchLatestNotifications]);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await fetchLatestNotifications();
    setIsRefreshing(false);
  };

  const markAllAsRead = async () => {
    const supabase = createClient();
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    notifyAppShellBadgeSync();
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", currentUserId)
      .eq("is_read", false);
    notifyAppShellBadgeSync();
    toast.success("All notifications marked as read");
  };

  const markSingleAsRead = async (notifId: string) => {
    const supabase = createClient();
    setNotifications((prev) =>
      prev.map((n) => (n.id === notifId ? { ...n, is_read: true } : n))
    );
    notifyAppShellBadgeSync();
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", notifId);
    notifyAppShellBadgeSync();
  };

  const deleteSingleNotification = async (
    e: React.MouseEvent,
    notifId: string
  ) => {
    e.preventDefault();
    e.stopPropagation();

    const supabase = createClient();
    setNotifications((prev) => prev.filter((n) => n.id !== notifId));
    notifyAppShellBadgeSync();

    const { error } = await supabase
      .from("notifications")
      .delete()
      .eq("id", notifId);

    if (error) {
      toast.error("Failed to delete notification");
    } else {
      notifyAppShellBadgeSync();
    }
  };

  const clearAllNotifications = async () => {
    if (notifications.length === 0) return;
    if (!confirm("Clear all notifications?")) return;

    const supabase = createClient();
    setNotifications([]);
    notifyAppShellBadgeSync();

    const { error } = await supabase
      .from("notifications")
      .delete()
      .eq("user_id", currentUserId);

    if (error) {
      toast.error("Failed to clear notifications");
    } else {
      notifyAppShellBadgeSync();
      toast.success("Notifications cleared");
    }
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;
  const displayedNotifications =
    filter === "unread"
      ? notifications.filter((n) => !n.is_read)
      : notifications;

  return (
    <div className="w-full max-w-2xl mx-auto px-3.5 sm:px-4 pt-2.5 pb-6 sm:py-6 flex flex-col space-y-2.5 sm:space-y-3 overflow-x-hidden">
      {/* Clean Spacious Header Row */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="h-8 w-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Bell className="h-4 w-4" />
          </div>
          <h1 className="text-lg sm:text-xl font-extrabold tracking-tight text-foreground whitespace-nowrap">
            <span>Alerts</span>
            <span className="hidden sm:inline"> &amp; Activity</span>
          </h1>
          {unreadCount > 0 && (
            <span className="inline-flex items-center justify-center bg-gradient-to-r from-[#FF5E3A] to-[#FF3366] text-white font-bold px-2.5 py-0.5 rounded-full text-[11px] leading-none whitespace-nowrap shrink-0 shadow-2xs">
              {unreadCount} new
            </span>
          )}
        </div>

        {/* Right Utility Controls */}
        <div className="flex items-center gap-1 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className="h-8 w-8 rounded-xl text-muted-foreground hover:text-foreground cursor-pointer"
            title="Sync notifications"
            aria-label="Sync notifications"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin text-primary" : ""}`}
            />
          </Button>

          {notifications.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAllNotifications}
              className="gap-1 text-xs rounded-xl h-8 px-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive cursor-pointer"
              title="Clear all notifications"
              aria-label="Clear all notifications"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Clear</span>
            </Button>
          )}
        </div>
      </div>

      {/* Compact Push Status Bar (iOS, Android & Web) */}
      <PushNotificationBanner />

      {/* Filter Pills + Mark All Read Row */}
      {notifications.length > 0 && (
        <div className="flex items-center justify-between gap-2 pt-0.5">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setFilter("all")}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                filter === "all"
                  ? "bg-foreground text-background shadow-2xs"
                  : "bg-card text-muted-foreground hover:text-foreground border border-border/70"
              }`}
            >
              All ({notifications.length})
            </button>
            <button
              type="button"
              onClick={() => setFilter("unread")}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                filter === "unread"
                  ? "bg-gradient-to-r from-[#FF5E3A] to-[#FF3366] text-white shadow-2xs"
                  : "bg-card text-muted-foreground hover:text-foreground border border-border/70"
              }`}
            >
              Unread ({unreadCount})
            </button>
          </div>

          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={markAllAsRead}
              className="gap-1.5 text-xs font-semibold rounded-full h-7.5 px-3 border-primary/25 text-primary hover:bg-primary/10 cursor-pointer whitespace-nowrap shrink-0"
            >
              <CheckCheck className="h-3.5 w-3.5" />
              <span>Mark all read</span>
            </Button>
          )}
        </div>
      )}

      {/* Notifications List */}
      {displayedNotifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center py-14 px-6 border border-dashed rounded-2xl bg-card/50">
          <div className="h-12 w-12 bg-primary/10 rounded-2xl flex items-center justify-center mb-3 text-primary">
            <BellOff className="h-5 w-5 opacity-75" />
          </div>
          <h2 className="text-sm font-semibold">
            {filter === "unread" ? "All caught up!" : "No notifications yet"}
          </h2>
          <p className="text-xs text-muted-foreground mt-1 max-w-xs">
            {filter === "unread"
              ? "You've read all your recent alerts and messages."
              : "Real-time messages, event joins, likes, and replies will appear here automatically."}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
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
                    className={`flex items-start sm:items-center gap-3 p-3 sm:p-3.5 rounded-2xl border transition-all active:scale-[0.99] ${
                      !notif.is_read
                        ? "bg-primary/[0.05] dark:bg-primary/[0.09] border-primary/30 shadow-2xs"
                        : "bg-card border-border/70 opacity-85 hover:opacity-100 hover:border-border"
                    }`}
                  >
                    {/* Actor Avatar */}
                    <div className="relative shrink-0 mt-0.5 sm:mt-0">
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
                          <span className="text-primary font-semibold ml-1">
                            &ldquo;{notif.event.title}&rdquo;
                          </span>
                        )}
                      </p>

                      {notif.post?.content && (
                        <p className="text-[11px] text-muted-foreground line-clamp-1 my-1 border-l-2 border-primary/30 pl-2">
                          {notif.post.content}
                        </p>
                      )}

                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="text-[11px] text-muted-foreground font-medium">
                          {timeFormatted}
                        </span>
                        {!notif.is_read && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-primary">
                            <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                            New
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>

                {/* Dismiss Button */}
                <button
                  type="button"
                  onClick={(e) => deleteSingleNotification(e, notif.id)}
                  className="absolute right-2.5 top-3 sm:top-1/2 sm:-translate-y-1/2 p-1.5 rounded-xl text-muted-foreground/60 hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer z-10"
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
