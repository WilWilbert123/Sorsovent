"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Send,
  Loader2,
  MessageSquare,
  ArrowLeft,
  Users,
  Smile,
  CalendarDays,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { safeFormatDate } from "@/lib/utils";
import { toast } from "sonner";
import { UserProfileModal } from "@/components/profile/user-profile-modal";
import {
  ReactionUsersModal,
  ReactionDetail,
} from "@/components/events/reaction-users-modal";

const EMOJI_OPTIONS = ["❤️", "😂", "😮", "😢", "👍", "🔥"];

interface ChatUser {
  id: string;
  name: string;
  username: string;
  avatar?: string | null;
}

interface Message {
  id: string;
  event_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  sender?: {
    id: string;
    display_name?: string | null;
    full_name?: string | null;
    username?: string | null;
    avatar_url?: string | null;
  };
}

interface EventChatRoomProps {
  eventId: string;
  eventTitle: string;
  currentUser: ChatUser;
  initialMessages: Message[];
}

export function EventChatRoom({
  eventId,
  eventTitle,
  currentUser,
  initialMessages = [],
}: EventChatRoomProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [inputContent, setInputContent] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Record<string, string>>({});

  // User Profile Modal State
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  // Message Reactions State
  const [reactionsMap, setReactionsMap] = useState<Record<string, ReactionDetail[]>>({});
  const [activeReactionPickerMsgId, setActiveReactionPickerMsgId] = useState<
    string | null
  >(null);
  const [viewingReactionsMsgId, setViewingReactionsMsgId] = useState<string | null>(
    null
  );
  const [isReactionModalOpen, setIsReactionModalOpen] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const touchTimerRef = useRef<NodeJS.Timeout | null>(null);
  const channelRef = useRef<any>(null);

  const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  useEffect(() => {
    scrollToBottom("auto");
  }, []);

  useEffect(() => {
    scrollToBottom("smooth");
  }, [messages.length]);

  // Mark unread event_chat notifications for this event as read when opening the room
  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", currentUser.id)
      .eq("event_id", eventId)
      .eq("type", "event_chat")
      .eq("is_read", false)
      .then(() => {
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("mingle:notifications-updated"));
        }
      });
  }, [eventId, currentUser.id]);

  // Set up Supabase Realtime channel for messages & broadcast typing
  useEffect(() => {
    const supabase = createClient();

    const channel = supabase.channel(`event-chat-room:${eventId}`, {
      config: {
        broadcast: { self: false },
      },
    });

    channelRef.current = channel;

    channel.on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "event_messages",
        filter: `event_id=eq.${eventId}`,
      },
      async (payload) => {
        const newMsg = payload.new as Message;

        let senderInfo = newMsg.sender;
        if (!senderInfo && newMsg.sender_id) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("id, display_name, full_name, username, avatar_url")
            .eq("id", newMsg.sender_id)
            .single();

          if (profile) senderInfo = profile;
        }

        setMessages((prev) => {
          if (prev.some((m) => m.id === newMsg.id)) return prev;
          const withoutTemp = prev.filter(
            (m) =>
              !(
                String(m.id).startsWith("temp-") &&
                m.sender_id === newMsg.sender_id &&
                m.content === newMsg.content
              )
          );
          return [...withoutTemp, { ...newMsg, sender: senderInfo }];
        });
      }
    );

    channel.on("broadcast", { event: "typing" }, (payload) => {
      const { userId, name, isTyping } = payload.payload || {};
      if (!userId || userId === currentUser.id) return;

      setTypingUsers((prev) => {
        const next = { ...prev };
        if (isTyping) {
          next[userId] = name || "Someone";
        } else {
          delete next[userId];
        }
        return next;
      });
    });

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [eventId, currentUser.id]);

  // Fetch reactions & subscribe to real-time reaction changes
  useEffect(() => {
    const supabase = createClient();

    async function loadReactions() {
      const msgIds = messages
        .map((m) => m.id)
        .filter((id) => !String(id).startsWith("temp-"));
      if (msgIds.length === 0) return;

      const { data: rxData } = await supabase
        .from("event_message_reactions")
        .select("*, user:profiles(id, display_name, full_name, username, avatar_url)")
        .in("message_id", msgIds);

      if (rxData) {
        const map: Record<string, ReactionDetail[]> = {};
        rxData.forEach((r: any) => {
          if (!map[r.message_id]) map[r.message_id] = [];
          map[r.message_id].push(r);
        });
        setReactionsMap(map);
      }
    }

    loadReactions();

    const rxChannel = supabase
      .channel(`event-reactions:${eventId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "event_message_reactions",
        },
        async (payload) => {
          if (payload.eventType === "INSERT") {
            const newRx = payload.new as any;
            const { data: userProfile } = await supabase
              .from("profiles")
              .select("id, display_name, full_name, username, avatar_url")
              .eq("id", newRx.user_id)
              .single();

            const rxWithUser = { ...newRx, user: userProfile };
            setReactionsMap((prev) => {
              const list = prev[newRx.message_id] || [];
              if (list.some((r) => r.id === newRx.id)) return prev;
              return {
                ...prev,
                [newRx.message_id]: [...list, rxWithUser],
              };
            });
          } else if (payload.eventType === "DELETE") {
            const oldRx = payload.old as any;
            setReactionsMap((prev) => {
              const list = prev[oldRx.message_id] || [];
              return {
                ...prev,
                [oldRx.message_id]: list.filter((r) => r.id !== oldRx.id),
              };
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(rxChannel);
    };
  }, [eventId, messages.length]);

  const handleToggleReaction = async (messageId: string, emoji: string) => {
    setActiveReactionPickerMsgId(null);
    if (String(messageId).startsWith("temp-")) return;

    const supabase = createClient();

    const msgReactions = reactionsMap[messageId] || [];
    const existingMyReaction = msgReactions.find(
      (r) => r.user_id === currentUser.id && r.emoji === emoji
    );

    if (existingMyReaction) {
      setReactionsMap((prev) => ({
        ...prev,
        [messageId]: (prev[messageId] || []).filter(
          (r) => r.id !== existingMyReaction.id
        ),
      }));
      await supabase
        .from("event_message_reactions")
        .delete()
        .eq("id", existingMyReaction.id);
    } else {
      const existingOther = msgReactions.find((r) => r.user_id === currentUser.id);
      if (existingOther) {
        await supabase
          .from("event_message_reactions")
          .delete()
          .eq("id", existingOther.id);
      }

      const tempId = `temp-rx-${Date.now()}`;
      const newRxItem: ReactionDetail = {
        id: tempId,
        message_id: messageId,
        user_id: currentUser.id,
        emoji: emoji,
        user: {
          id: currentUser.id,
          display_name: currentUser.name,
          full_name: currentUser.name,
          username: currentUser.username,
          avatar_url: currentUser.avatar,
        },
      };

      setReactionsMap((prev) => ({
        ...prev,
        [messageId]: [
          ...(prev[messageId] || []).filter((r) => r.user_id !== currentUser.id),
          newRxItem,
        ],
      }));

      const { data: inserted } = await supabase
        .from("event_message_reactions")
        .insert({
          message_id: messageId,
          user_id: currentUser.id,
          emoji,
        })
        .select("*, user:profiles(id, display_name, full_name, username, avatar_url)")
        .single();

      if (inserted) {
        setReactionsMap((prev) => ({
          ...prev,
          [messageId]: (prev[messageId] || []).map((r) =>
            r.id === tempId ? inserted : r
          ),
        }));
      }
    }
  };

  const handleTouchStart = (msgId: string) => {
    touchTimerRef.current = setTimeout(() => {
      setActiveReactionPickerMsgId(msgId);
    }, 350);
  };

  const handleTouchEnd = () => {
    if (touchTimerRef.current) clearTimeout(touchTimerRef.current);
  };

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    setInputContent(e.target.value);

    if (channelRef.current) {
      channelRef.current.send({
        type: "broadcast",
        event: "typing",
        payload: {
          userId: currentUser.id,
          name: currentUser.name,
          isTyping: true,
        },
      });
    }

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    typingTimeoutRef.current = setTimeout(() => {
      if (channelRef.current) {
        channelRef.current.send({
          type: "broadcast",
          event: "typing",
          payload: {
            userId: currentUser.id,
            name: currentUser.name,
            isTyping: false,
          },
        });
      }
    }, 2000);
  }

  async function handleSendMessage(e?: React.FormEvent) {
    if (e) e.preventDefault();

    const trimmed = inputContent.trim();
    if (!trimmed || isSending) return;

    setIsSending(true);
    setInputContent("");

    if (channelRef.current) {
      channelRef.current.send({
        type: "broadcast",
        event: "typing",
        payload: {
          userId: currentUser.id,
          name: currentUser.name,
          isTyping: false,
        },
      });
    }

    // Optimistic insertion for instant mobile response
    const tempId = `temp-${Date.now()}`;
    const optimisticMsg: Message = {
      id: tempId,
      event_id: eventId,
      sender_id: currentUser.id,
      content: trimmed,
      created_at: new Date().toISOString(),
      sender: {
        id: currentUser.id,
        display_name: currentUser.name,
        full_name: currentUser.name,
        username: currentUser.username,
        avatar_url: currentUser.avatar,
      },
    };
    setMessages((prev) => [...prev, optimisticMsg]);

    const supabase = createClient();
    const { data: newMsg, error } = await supabase
      .from("event_messages")
      .insert({
        event_id: eventId,
        sender_id: currentUser.id,
        content: trimmed,
      })
      .select("*, sender:profiles(id, display_name, full_name, username, avatar_url)")
      .single();

    setIsSending(false);

    if (error) {
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      toast.error("Failed to send message: " + error.message);
    } else if (newMsg) {
      setMessages((prev) => {
        const hasReal = prev.some((m) => m.id === newMsg.id);
        if (hasReal) return prev.filter((m) => m.id !== tempId);
        return prev.map((m) => (m.id === tempId ? newMsg : m));
      });

      // Trigger push notification to other attendees and event creator
      Promise.all([
        supabase.from("event_attendees").select("user_id").eq("event_id", eventId),
        supabase.from("events").select("creator_id").eq("id", eventId).single(),
      ]).then(([attendeesRes, eventRes]) => {
        const attendeeIds = attendeesRes.data?.map((a) => a.user_id) || [];
        const creatorId = eventRes.data?.creator_id;
        const allTargetIds = Array.from(
          new Set([...attendeeIds, creatorId].filter((id): id is string => Boolean(id)))
        ).filter((id) => id !== currentUser.id);

        if (allTargetIds.length > 0) {
          fetch("/api/notifications/send-push", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              targetUserIds: allTargetIds,
              title: `💬 ${eventTitle}`,
              body: `${currentUser.name}: ${trimmed}`,
              url: `/events/${eventId}/chat`,
              eventId: eventId,
            }),
          }).catch((err) => console.error("Push notification error:", err));
        }
      });
    }
  }

  const typingList = Object.values(typingUsers);
  let typingText = "";
  if (typingList.length === 1) {
    typingText = `${typingList[0]} is typing...`;
  } else if (typingList.length === 2) {
    typingText = `${typingList[0]} and ${typingList[1]} are typing...`;
  } else if (typingList.length > 2) {
    typingText = `${typingList[0]} and ${typingList.length - 1} others are typing...`;
  }

  return (
    <div className="max-w-4xl mx-auto px-0 sm:px-4 sm:py-3 h-[calc(100dvh-8.5rem)] md:h-[calc(100dvh-2.5rem)] flex flex-col">
      <div className="flex-1 border-0 sm:border rounded-none sm:rounded-2xl bg-card shadow-2xs overflow-hidden flex flex-col h-full">
        {/* Top Header */}
        <div className="px-3 py-2.5 sm:px-4 sm:py-3 border-b bg-background/95 backdrop-blur-md flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <Link
              href="/messages"
              className="p-2 -ml-1 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground transition-colors shrink-0"
              title="Back to chats"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>

            <div className="min-w-0">
              <Link
                href={`/events/${eventId}`}
                className="text-sm sm:text-base font-bold truncate hover:text-primary transition-colors block"
              >
                {eventTitle}
              </Link>
              <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                <Users className="h-3 w-3 text-[#FF3366]" />
                <span>Event Group Chat</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <Link href={`/events/${eventId}`}>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2.5 gap-1 text-xs font-semibold rounded-xl text-muted-foreground hover:text-foreground"
              >
                <CalendarDays className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Event</span>
              </Button>
            </Link>
            <Link href={`/events/${eventId}/attendees`}>
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-2.5 gap-1.5 text-xs font-semibold rounded-xl"
              >
                <Users className="h-3.5 w-3.5 text-primary" />
                <span className="hidden xs:inline">Members</span>
              </Button>
            </Link>
          </div>
        </div>

        {/* Messages Feed */}
        <div className="flex-1 overflow-y-auto px-3 sm:px-4 py-3 space-y-3 min-h-0">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground p-6">
              <div className="h-12 w-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-3">
                <MessageSquare className="h-6 w-6" />
              </div>
              <p className="font-semibold text-sm text-foreground">No messages yet</p>
              <p className="text-xs mt-1 max-w-xs">
                Say hello to everyone attending <strong>{eventTitle}</strong>!
              </p>
            </div>
          ) : (
            messages.map((msg, idx) => {
              const isMe = msg.sender_id === currentUser.id;
              const senderName =
                msg.sender?.full_name ||
                msg.sender?.display_name ||
                msg.sender?.username ||
                (isMe ? currentUser.name : "Attendee");

              const prevMsg = idx > 0 ? messages[idx - 1] : null;
              const showHeader = !prevMsg || prevMsg.sender_id !== msg.sender_id;

              const timeStr = safeFormatDate(msg.created_at, "h:mm a");
              const msgRxList = reactionsMap[msg.id] || [];

              const rxCounts: Record<string, number> = {};
              msgRxList.forEach((r) => {
                rxCounts[r.emoji] = (rxCounts[r.emoji] || 0) + 1;
              });

              return (
                <div
                  key={msg.id}
                  className={`relative group flex gap-2 ${
                    isMe ? "flex-row-reverse" : "flex-row"
                  }`}
                  onTouchStart={() => handleTouchStart(msg.id)}
                  onTouchEnd={handleTouchEnd}
                >
                  {/* Avatar */}
                  <div
                    onClick={() => {
                      setSelectedUserId(msg.sender_id);
                      setIsProfileModalOpen(true);
                    }}
                    className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden text-xs font-bold text-primary border cursor-pointer hover:ring-2 hover:ring-primary/40 transition-all self-end mb-0.5"
                    title={`View ${senderName}'s profile`}
                  >
                    {msg.sender?.avatar_url ? (
                      <img
                        src={msg.sender.avatar_url}
                        alt={senderName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      senderName[0]?.toUpperCase() || "U"
                    )}
                  </div>

                  {/* Message Container */}
                  <div
                    className={`max-w-[82%] sm:max-w-[70%] space-y-1 flex flex-col ${
                      isMe ? "items-end" : "items-start"
                    }`}
                  >
                    {showHeader && (
                      <div className="flex items-center gap-1.5 px-1">
                        <span
                          onClick={() => {
                            setSelectedUserId(msg.sender_id);
                            setIsProfileModalOpen(true);
                          }}
                          className="text-[11px] font-semibold text-muted-foreground hover:text-primary cursor-pointer transition-colors"
                        >
                          {isMe ? "You" : senderName}
                        </span>
                        <span className="text-[10px] text-muted-foreground/65">
                          {timeStr}
                        </span>
                      </div>
                    )}

                    {/* Floating 6 Emoji Reaction Picker Bar */}
                    {activeReactionPickerMsgId === msg.id && (
                      <div
                        className={`flex items-center gap-1 p-1 bg-card/95 backdrop-blur-md border border-border shadow-xl rounded-full z-20 animate-in fade-in zoom-in-95 duration-150 ${
                          isMe ? "self-end" : "self-start"
                        }`}
                      >
                        {EMOJI_OPTIONS.map((emoji) => {
                          const hasReacted = msgRxList.some(
                            (r) =>
                              r.user_id === currentUser.id && r.emoji === emoji
                          );
                          return (
                            <button
                              key={emoji}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleReaction(msg.id, emoji);
                              }}
                              className={`text-base sm:text-lg p-1 hover:scale-125 active:scale-95 transition-transform rounded-full ${
                                hasReacted
                                  ? "bg-primary/20 ring-1 ring-primary"
                                  : "hover:bg-muted"
                              }`}
                            >
                              {emoji}
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/* Message Bubble + Reaction Trigger Button */}
                    <div className="relative group/bubble flex items-center gap-1 max-w-full">
                      <button
                        type="button"
                        onClick={() =>
                          setActiveReactionPickerMsgId(
                            activeReactionPickerMsgId === msg.id ? null : msg.id
                          )
                        }
                        className={`opacity-60 sm:opacity-0 group-hover/bubble:opacity-100 p-1 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-all shrink-0 ${
                          isMe ? "order-first" : "order-last"
                        }`}
                        title="React to message"
                      >
                        <Smile className="h-3.5 w-3.5" />
                      </button>

                      <div
                        className={`w-fit inline-block px-3.5 py-2 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap break-words shadow-2xs ${
                          isMe
                            ? "bg-gradient-to-br from-[#FF5E3A] to-[#FF3366] text-white rounded-tr-xs"
                            : "bg-muted/80 dark:bg-muted text-foreground rounded-tl-xs border border-border/50"
                        }`}
                      >
                        {msg.content}
                      </div>
                    </div>

                    {/* Reaction Pill Badges */}
                    {Object.keys(rxCounts).length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-0.5">
                        {Object.entries(rxCounts).map(([emoji, count]) => {
                          const myRx = msgRxList.some(
                            (r) =>
                              r.user_id === currentUser.id && r.emoji === emoji
                          );
                          return (
                            <button
                              key={emoji}
                              onClick={() => {
                                setViewingReactionsMsgId(msg.id);
                                setIsReactionModalOpen(true);
                              }}
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border shadow-2xs transition-all hover:scale-105 active:scale-95 ${
                                myRx
                                  ? "bg-primary/15 border-primary/40 text-primary"
                                  : "bg-card border-border text-foreground hover:bg-muted"
                              }`}
                              title="Tap to see who reacted"
                            >
                              <span>{emoji}</span>
                              <span className="text-[11px] font-bold">{count}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Typing Indicator Bar */}
        {typingText && (
          <div className="px-4 py-1 shrink-0 flex items-center bg-background/60">
            <p className="text-xs text-primary font-medium italic animate-pulse flex items-center gap-1.5">
              <span className="inline-block w-2 h-2 rounded-full bg-primary animate-ping" />
              {typingText}
            </p>
          </div>
        )}

        {/* Input Box (16px on mobile to prevent iOS Safari zoom) */}
        <form
          onSubmit={handleSendMessage}
          className="p-2.5 sm:p-3 border-t bg-background/95 backdrop-blur-md shrink-0 flex items-center gap-2"
        >
          <input
            type="text"
            value={inputContent}
            onChange={handleInputChange}
            placeholder="Message event group..."
            className="flex h-10 w-full rounded-full border border-border/80 bg-muted/40 px-4 py-2 text-base sm:text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          />
          <Button
            type="submit"
            size="icon"
            disabled={!inputContent.trim() || isSending}
            className="h-10 w-10 rounded-full bg-gradient-to-r from-[#FF5E3A] to-[#FF3366] text-white border-0 shrink-0 shadow-xs cursor-pointer"
          >
            {isSending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </form>
      </div>

      {/* User Profile Preview Modal */}
      <UserProfileModal
        userId={selectedUserId}
        open={isProfileModalOpen}
        onOpenChange={setIsProfileModalOpen}
      />

      {/* Message Reactions Users Modal */}
      <ReactionUsersModal
        open={isReactionModalOpen}
        onOpenChange={setIsReactionModalOpen}
        reactions={
          viewingReactionsMsgId ? reactionsMap[viewingReactionsMsgId] || [] : []
        }
      />
    </div>
  );
}
