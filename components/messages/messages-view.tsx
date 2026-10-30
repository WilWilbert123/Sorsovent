"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  MessageSquare,
  Users,
  Compass,
  ChevronRight,
  Clock,
  Loader2,
  Search,
  X,
  MapPin,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { safeFormatDate, cn } from "@/lib/utils";
import { getCategoryEmoji } from "@/lib/map/emoji";
import { UserPresenceIndicator } from "@/components/presence/user-presence-indicator";
import { createClient } from "@/lib/supabase/client";
import { getUserChatsOverview } from "@/app/actions/conversations";

interface EventGroupChat {
  id: string;
  title: string;
  category?: string | null;
  location_name?: string | null;
  cover_image?: string | null;
  latestMessage?: {
    content: string;
    created_at: string;
    senderName?: string;
  } | null;
  isCreator: boolean;
}

export interface DirectMessageChat {
  id: string;
  otherUser: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl?: string | null;
    lastSeenAt?: string | null;
  };
  latestMessage?: {
    content: string;
    created_at: string;
    isFromMe?: boolean;
  } | null;
  updatedAt: string;
}

interface MessagesViewProps {
  eventChats: EventGroupChat[];
  directMessages?: DirectMessageChat[];
  initialTab?: "event_chats" | "direct";
}

export function MessagesView({
  eventChats: initialEventChats,
  directMessages: initialDirectMessages = [],
  initialTab = "event_chats",
}: MessagesViewProps) {
  const [activeTab, setActiveTab] = useState<"event_chats" | "direct">(initialTab);
  const [navigatingId, setNavigatingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [eventChats, setEventChats] = useState<EventGroupChat[]>(initialEventChats);
  const [directMessages, setDirectMessages] =
    useState<DirectMessageChat[]>(initialDirectMessages);

  const syncChatsOverview = useCallback(async () => {
    try {
      const res = await getUserChatsOverview();
      if (res.eventChats) setEventChats(res.eventChats);
      if (res.directMessages) setDirectMessages(res.directMessages);
    } catch (err) {
      console.error("Failed to sync chats overview:", err);
    }
  }, []);

  // Auto-sync on mount, on realtime notifications/messages, and while visible
  useEffect(() => {
    syncChatsOverview();

    const supabase = createClient();

    const channel = supabase
      .channel("realtime:messages_hub")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "event_messages" },
        () => {
          syncChatsOverview();
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        () => {
          syncChatsOverview();
        }
      )
      .subscribe();

    const handleRealtimeNotif = () => {
      syncChatsOverview();
    };

    const handleVisibility = () => {
      if (!document.hidden) {
        syncChatsOverview();
      }
    };

    const pollInterval = setInterval(() => {
      if (typeof document !== "undefined" && !document.hidden) {
        syncChatsOverview();
      }
    }, 4000);

    window.addEventListener("mingle:realtime-notification", handleRealtimeNotif);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      clearInterval(pollInterval);
      supabase.removeChannel(channel);
      window.removeEventListener(
        "mingle:realtime-notification",
        handleRealtimeNotif
      );
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [syncChatsOverview]);

  const filteredEventChats = useMemo(() => {
    if (!searchQuery.trim()) return eventChats;
    const q = searchQuery.toLowerCase();
    return eventChats.filter(
      (c) =>
        c.title?.toLowerCase().includes(q) ||
        c.location_name?.toLowerCase().includes(q) ||
        c.latestMessage?.content?.toLowerCase().includes(q)
    );
  }, [eventChats, searchQuery]);

  const filteredDirectMessages = useMemo(() => {
    if (!searchQuery.trim()) return directMessages;
    const q = searchQuery.toLowerCase();
    return directMessages.filter(
      (dm) =>
        dm.otherUser?.displayName?.toLowerCase().includes(q) ||
        dm.otherUser?.username?.toLowerCase().includes(q) ||
        dm.latestMessage?.content?.toLowerCase().includes(q)
    );
  }, [directMessages, searchQuery]);

  return (
    <div className="w-full max-w-3xl mx-auto px-3.5 sm:px-4 pt-2 pb-6 sm:py-6 flex flex-col space-y-3.5 overflow-x-hidden">
      {/* Compact Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-[#FF5E3A]/15 to-[#FF3366]/15 text-[#FF3366] flex items-center justify-center shrink-0">
            <MessageSquare className="h-4.5 w-4.5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl font-bold tracking-tight truncate">
              Chat &amp; Rooms
            </h1>
          </div>
        </div>

        <Link href="/explore" prefetch={true}>
          <Button
            variant="outline"
            size="sm"
            className="h-8 px-3 gap-1.5 text-xs font-semibold rounded-xl border-border/80 cursor-pointer"
          >
            <Compass className="h-3.5 w-3.5 text-[#FF3366]" />
            <span>Explore</span>
          </Button>
        </Link>
      </div>

      {/* Search Conversations Input */}
      <div className="relative w-full">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={
            activeTab === "event_chats"
              ? "Search event group chats..."
              : "Search direct messages..."
          }
          className="w-full pl-9 pr-8 h-10 rounded-xl bg-card border-border/80 text-base sm:text-sm shadow-2xs"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-full text-muted-foreground hover:text-foreground"
            aria-label="Clear search"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Responsive 2-Column Segmented Pill Tabs */}
      <div className="grid grid-cols-2 gap-1.5 p-1 rounded-2xl bg-muted/70 border border-border/60">
        <button
          onClick={() => setActiveTab("event_chats")}
          className={cn(
            "flex items-center justify-center gap-1.5 py-2 px-3 text-xs sm:text-sm font-semibold rounded-xl transition-all cursor-pointer",
            activeTab === "event_chats"
              ? "bg-gradient-to-r from-[#FF5E3A] via-[#FF3366] to-[#E11D48] text-white shadow-xs"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Users className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">Group Chats</span>
          <span
            className={cn(
              "text-[10px] font-bold px-1.5 py-0.2 rounded-full shrink-0",
              activeTab === "event_chats"
                ? "bg-white/20 text-white"
                : "bg-background text-muted-foreground"
            )}
          >
            {eventChats.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("direct")}
          className={cn(
            "flex items-center justify-center gap-1.5 py-2 px-3 text-xs sm:text-sm font-semibold rounded-xl transition-all cursor-pointer",
            activeTab === "direct"
              ? "bg-gradient-to-r from-[#FF5E3A] via-[#FF3366] to-[#E11D48] text-white shadow-xs"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <MessageSquare className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">Direct Messages</span>
          <span
            className={cn(
              "text-[10px] font-bold px-1.5 py-0.2 rounded-full shrink-0",
              activeTab === "direct"
                ? "bg-white/20 text-white"
                : "bg-background text-muted-foreground"
            )}
          >
            {directMessages.length}
          </span>
        </button>
      </div>

      {/* Tab Content: Event Group Chats */}
      {activeTab === "event_chats" && (
        <div className="flex-1">
          {filteredEventChats.length === 0 ? (
            <div className="text-center py-12 px-4 border border-dashed rounded-2xl bg-card/50">
              <div className="h-12 w-12 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-3 text-primary">
                <Users className="h-6 w-6" />
              </div>
              <h3 className="text-sm font-semibold mb-1">
                {searchQuery ? "No matching group chats" : "No Event Group Chats Yet"}
              </h3>
              <p className="text-xs text-muted-foreground max-w-xs mx-auto mb-5">
                {searchQuery
                  ? "Try a different search keyword."
                  : "Join any event or host your own to unlock its real-time attendee group chat."}
              </p>
              {!searchQuery && (
                <Link href="/explore" prefetch={true}>
                  <Button size="sm" className="rounded-xl">
                    Explore Events
                  </Button>
                </Link>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredEventChats.map((chat) => {
                const isNavigating = navigatingId === chat.id;
                const emoji = getCategoryEmoji(chat.category || undefined, chat.title);
                const timeAgo = chat.latestMessage?.created_at
                  ? safeFormatDate(chat.latestMessage.created_at, "h:mm a")
                  : "";

                return (
                  <Link
                    key={chat.id}
                    href={`/events/${chat.id}/chat`}
                    prefetch={true}
                    onClick={() => setNavigatingId(chat.id)}
                    className="block"
                  >
                    <div
                      className={cn(
                        "flex items-center gap-3 p-3 sm:p-3.5 rounded-2xl border bg-card transition-all group active:scale-[0.99] cursor-pointer",
                        isNavigating
                          ? "border-primary ring-2 ring-primary/30 bg-primary/5"
                          : "border-border/80 hover:border-primary/40 hover:shadow-xs"
                      )}
                    >
                      {/* Consistent 48x48 Group Avatar */}
                      <div className="h-12 w-12 rounded-2xl overflow-hidden shrink-0 border border-border/60 bg-gradient-to-br from-[#FF5E3A]/12 to-[#FF3366]/12 flex items-center justify-center relative">
                        {chat.cover_image ? (
                          <img
                            src={chat.cover_image}
                            alt={chat.title}
                            className="h-full w-full object-cover group-hover:scale-105 transition-transform"
                          />
                        ) : (
                          <span className="text-xl">{emoji}</span>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <h3 className="font-semibold text-sm truncate group-hover:text-primary transition-colors">
                              {chat.title}
                            </h3>
                            {chat.isCreator && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-primary/12 text-primary shrink-0">
                                Host
                              </span>
                            )}
                          </div>
                          {timeAgo && (
                            <span className="text-[11px] text-muted-foreground shrink-0 flex items-center gap-1">
                              <Clock className="h-2.5 w-2.5" /> {timeAgo}
                            </span>
                          )}
                        </div>

                        {chat.location_name && (
                          <p className="text-[11px] text-muted-foreground/80 truncate flex items-center gap-1 mt-0.5">
                            <MapPin className="h-2.5 w-2.5 text-emerald-500 shrink-0" />
                            <span className="truncate">{chat.location_name}</span>
                          </p>
                        )}

                        <p className="text-xs text-muted-foreground truncate mt-1">
                          {chat.latestMessage ? (
                            <span>
                              <strong className="text-foreground/85 font-semibold">
                                {chat.latestMessage.senderName}:{" "}
                              </strong>
                              {chat.latestMessage.content}
                            </span>
                          ) : (
                            <span className="italic text-muted-foreground/70">
                              Tap to start chatting with event attendees
                            </span>
                          )}
                        </p>
                      </div>

                      {isNavigating ? (
                        <Loader2 className="h-4 w-4 text-primary animate-spin shrink-0" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0" />
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab Content: Direct Messages */}
      {activeTab === "direct" && (
        <div className="flex-1">
          {filteredDirectMessages.length === 0 ? (
            <div className="text-center py-12 px-4 border border-dashed rounded-2xl bg-card/50">
              <div className="h-12 w-12 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-3 text-primary">
                <MessageSquare className="h-6 w-6" />
              </div>
              <h3 className="text-sm font-semibold mb-1">
                {searchQuery ? "No matching conversations" : "No Direct Messages Yet"}
              </h3>
              <p className="text-xs text-muted-foreground max-w-xs mx-auto mb-5">
                {searchQuery
                  ? "Try searching a different name or username."
                  : "Visit any community member's profile and tap Message to start a 1-on-1 chat."}
              </p>
              {!searchQuery && (
                <Link href="/explore" prefetch={true}>
                  <Button variant="outline" size="sm" className="rounded-xl">
                    Discover People
                  </Button>
                </Link>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredDirectMessages.map((dm) => {
                const isNavigating = navigatingId === dm.id;
                const timeAgo = dm.latestMessage?.created_at
                  ? safeFormatDate(dm.latestMessage.created_at, "h:mm a")
                  : "";

                return (
                  <Link
                    key={dm.id}
                    href={`/messages/${dm.id}`}
                    prefetch={true}
                    onClick={() => setNavigatingId(dm.id)}
                    className="block"
                  >
                    <div
                      className={cn(
                        "flex items-center gap-3 p-3 sm:p-3.5 rounded-2xl border bg-card transition-all group active:scale-[0.99] cursor-pointer",
                        isNavigating
                          ? "border-primary ring-2 ring-primary/30 bg-primary/5"
                          : "border-border/80 hover:border-primary/40 hover:shadow-xs"
                      )}
                    >
                      {/* Avatar with presence dot */}
                      <div className="relative shrink-0">
                        {dm.otherUser?.avatarUrl ? (
                          <div className="h-12 w-12 rounded-full overflow-hidden border border-border/60">
                            <img
                              src={dm.otherUser.avatarUrl}
                              alt={dm.otherUser.displayName}
                              className="h-full w-full object-cover group-hover:scale-105 transition-transform"
                            />
                          </div>
                        ) : (
                          <div className="h-12 w-12 rounded-full bg-gradient-to-br from-[#FF5E3A]/15 to-[#FF3366]/15 flex items-center justify-center font-bold text-[#FF3366] text-sm border border-border/50">
                            {dm.otherUser?.displayName?.slice(0, 2).toUpperCase() || "U"}
                          </div>
                        )}
                        <UserPresenceIndicator
                          lastSeenAt={dm.otherUser?.lastSeenAt}
                          size="sm"
                          avatarDot
                          className="absolute bottom-0 right-0"
                        />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <h3 className="font-semibold text-sm truncate group-hover:text-primary transition-colors">
                              {dm.otherUser?.displayName}
                            </h3>
                            <span className="text-[11px] text-muted-foreground truncate hidden xs:inline">
                              @{dm.otherUser?.username}
                            </span>
                          </div>
                          {timeAgo && (
                            <span className="text-[11px] text-muted-foreground shrink-0 flex items-center gap-1">
                              <Clock className="h-2.5 w-2.5" /> {timeAgo}
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-muted-foreground truncate mt-1">
                          {dm.latestMessage ? (
                            <span>
                              {dm.latestMessage.isFromMe && (
                                <span className="font-semibold text-foreground/85">
                                  You:{" "}
                                </span>
                              )}
                              {dm.latestMessage.content}
                            </span>
                          ) : (
                            <span className="italic text-muted-foreground/70">
                              Tap to start chatting!
                            </span>
                          )}
                        </p>
                      </div>

                      {isNavigating ? (
                        <Loader2 className="h-4 w-4 text-primary animate-spin shrink-0" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0" />
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
