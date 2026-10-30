"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MessageSquare } from "lucide-react";
import { safeFormatDate } from "@/lib/utils";
import { getConversationMessages } from "@/app/actions/conversations";

export function ChatMessages({
  initialMessages,
  conversationId,
  currentUserId,
}: {
  initialMessages: any[];
  conversationId: string;
  currentUserId: string;
}) {
  const [messages, setMessages] = useState(initialMessages);
  const [isOtherTyping, setIsOtherTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const isFetchingRef = useRef(false);

  const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
    bottomRef.current?.scrollIntoView({ behavior });
  };

  useEffect(() => {
    scrollToBottom("auto");
  }, []);

  useEffect(() => {
    scrollToBottom("smooth");
  }, [messages.length, isOtherTyping]);

  // Reliable server-backed sync that bypasses client RLS and clears unread badges
  const syncConversationFromServer = useCallback(async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    try {
      const res = await getConversationMessages(conversationId);
      if (res.messages && res.messages.length > 0) {
        setMessages((prev) => {
          // Preserve any in-flight optimistic messages not yet saved
          const pendingOptimistic = prev.filter(
            (m) =>
              String(m.id).startsWith("temp-") &&
              !res.messages.some(
                (srv: any) =>
                  srv.sender_id === m.sender_id && srv.content === m.content
              )
          );
          const merged = [...res.messages, ...pendingOptimistic];
          // Only trigger state update if count or latest ID changed
          if (
            merged.length === prev.length &&
            merged[merged.length - 1]?.id === prev[prev.length - 1]?.id
          ) {
            return prev;
          }
          return merged;
        });
      }
      if (res.unreadCleared && typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("mingle:notifications-updated"));
      }
    } catch (err) {
      console.error("Failed to sync conversation messages:", err);
    } finally {
      isFetchingRef.current = false;
    }
  }, [conversationId]);

  useEffect(() => {
    // Immediate sync on mount (fixes stale Next.js router cache & clears unread badge)
    syncConversationFromServer();
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("mingle:notifications-updated"));
    }

    const supabase = createClient();

    const channel = supabase
      .channel(`chat_${conversationId}`, {
        config: { broadcast: { self: false } },
      })
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        async (payload) => {
          const incoming = payload.new as any;

          const { data: author } = await supabase
            .from("profiles")
            .select("username, full_name, avatar_url")
            .eq("id", incoming.sender_id)
            .maybeSingle();

          const newMessage = {
            ...incoming,
            profiles: author,
          };

          setMessages((prev) => {
            if (prev.some((m) => m.id === newMessage.id)) return prev;
            const filteredOptimistic = prev.filter(
              (m) =>
                !(
                  String(m.id).startsWith("temp-") &&
                  m.sender_id === newMessage.sender_id &&
                  m.content === newMessage.content
                )
            );
            return [...filteredOptimistic, newMessage];
          });
          setIsOtherTyping(false);
          syncConversationFromServer();
        }
      )
      .on("broadcast", { event: "new_message" }, (payload) => {
        const broadcastedMsg = payload.payload?.message;
        if (broadcastedMsg) {
          setMessages((prev) => {
            if (prev.some((m) => m.id === broadcastedMsg.id)) return prev;
            return [...prev, broadcastedMsg];
          });
          setIsOtherTyping(false);
        }
        // Also sync with server to clear the unread notification badge immediately
        syncConversationFromServer();
      })
      .on("broadcast", { event: "typing" }, (payload) => {
        const { userId, isTyping } = payload.payload || {};
        if (userId && userId !== currentUserId) {
          setIsOtherTyping(Boolean(isTyping));
        }
      })
      .subscribe();

    const handleOptimisticMessage = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (!detail || detail.conversationId !== conversationId) return;
      setMessages((prev) => {
        if (prev.some((m) => m.id === detail.message.id)) return prev;
        return [...prev, detail.message];
      });
    };

    const handleConfirmedMessage = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (!detail || detail.conversationId !== conversationId) return;
      setMessages((prev) => {
        const hasReal = prev.some((m) => m.id === detail.message.id);
        if (hasReal) {
          return prev.filter((m) => m.id !== detail.tempId);
        }
        return prev.map((m) => (m.id === detail.tempId ? detail.message : m));
      });
    };

    // Triggered by AppShell whenever a realtime notification or foreground push arrives!
    const handleRealtimeNotification = () => {
      syncConversationFromServer();
    };

    const handleVisibility = () => {
      if (!document.hidden) {
        syncConversationFromServer();
      }
    };

    // Lightweight 3.5s active-room sync while tab is visible so messages never require manual refresh
    const pollInterval = setInterval(() => {
      if (typeof document !== "undefined" && !document.hidden) {
        syncConversationFromServer();
      }
    }, 3500);

    window.addEventListener("mingle:dm-optimistic", handleOptimisticMessage);
    window.addEventListener("mingle:dm-confirmed", handleConfirmedMessage);
    window.addEventListener(
      "mingle:realtime-notification",
      handleRealtimeNotification
    );
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      clearInterval(pollInterval);
      supabase.removeChannel(channel);
      window.removeEventListener("mingle:dm-optimistic", handleOptimisticMessage);
      window.removeEventListener("mingle:dm-confirmed", handleConfirmedMessage);
      window.removeEventListener(
        "mingle:realtime-notification",
        handleRealtimeNotification
      );
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [conversationId, currentUserId, syncConversationFromServer]);

  if (messages.length === 0) {
    return (
      <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center justify-center text-center text-muted-foreground">
        <div className="h-12 w-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-3">
          <MessageSquare className="h-6 w-6" />
        </div>
        <p className="font-semibold text-sm text-foreground">Start the conversation</p>
        <p className="text-xs text-muted-foreground mt-1 max-w-xs">
          Send a friendly message below. Messages sync in real time across devices.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-3 sm:px-4 py-3 space-y-2.5 min-h-0">
      {messages.map((msg, i) => {
        const isMine = msg.sender_id === currentUserId;
        const author = Array.isArray(msg.profiles) ? msg.profiles[0] : msg.profiles;

        const prevMsg = i > 0 ? messages[i - 1] : null;
        const showHeader = !prevMsg || prevMsg.sender_id !== msg.sender_id;
        const timeStr = safeFormatDate(msg.created_at, "h:mm a");
        const senderName = author?.full_name || author?.username || "User";

        return (
          <div
            key={msg.id}
            className={`flex gap-2 ${isMine ? "flex-row-reverse" : "flex-row"} ${
              showHeader ? "mt-2" : "mt-0.5"
            }`}
          >
            {!isMine && (
              <div className="w-7 shrink-0 flex flex-col justify-end">
                {showHeader ? (
                  <Avatar className="h-7 w-7 border border-border/60">
                    <AvatarImage src={author?.avatar_url || undefined} />
                    <AvatarFallback className="text-[10px] font-bold bg-primary/10 text-primary">
                      {senderName[0]?.toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                ) : null}
              </div>
            )}

            <div
              className={`max-w-[82%] sm:max-w-[70%] flex flex-col ${
                isMine ? "items-end" : "items-start"
              }`}
            >
              {showHeader && (
                <div className="flex items-center gap-1.5 mb-1 px-1">
                  {!isMine && (
                    <span className="text-[11px] text-muted-foreground font-semibold">
                      {senderName}
                    </span>
                  )}
                  <span className="text-[10px] text-muted-foreground/65">
                    {timeStr}
                  </span>
                </div>
              )}

              <div
                className={`w-fit rounded-2xl px-3.5 py-2 text-sm leading-relaxed whitespace-pre-wrap break-words shadow-2xs ${
                  isMine
                    ? "bg-gradient-to-br from-[#FF5E3A] to-[#FF3366] text-white rounded-tr-xs"
                    : "bg-muted/80 dark:bg-muted text-foreground border border-border/50 rounded-tl-xs"
                }`}
              >
                {msg.content}
              </div>
            </div>
          </div>
        );
      })}

      {isOtherTyping && (
        <div className="flex items-center gap-2 pl-9 pt-1 text-xs text-primary font-medium italic animate-pulse">
          <span className="inline-block w-2 h-2 rounded-full bg-primary animate-ping" />
          Typing a message...
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}
