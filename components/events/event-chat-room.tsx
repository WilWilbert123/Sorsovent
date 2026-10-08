"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { Send, Loader2, MessageSquare, ArrowLeft, Users, Smile } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { safeFormatDate } from "@/lib/utils";
import { toast } from "sonner";
import { UserProfileModal } from "@/components/profile/user-profile-modal";
import { ReactionUsersModal, ReactionDetail } from "@/components/events/reaction-users-modal";

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
  const [activeReactionPickerMsgId, setActiveReactionPickerMsgId] = useState<string | null>(null);
  const [viewingReactionsMsgId, setViewingReactionsMsgId] = useState<string | null>(null);
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
  }, [messages]);

  // Set up Supabase Realtime channel for messages & broadcast typing
  useEffect(() => {
    const supabase = createClient();

    const channel = supabase.channel(`event-chat-room:${eventId}`, {
      config: {
        broadcast: { self: false },
      },
    });

    channelRef.current = channel;

    // Listen for new messages inserted in database
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

        // Fetch sender profile if missing
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
          return [...prev, { ...newMsg, sender: senderInfo }];
        });
      }
    );

    // Listen for broadcast typing events
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
      const msgIds = messages.map((m) => m.id);
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

    // Subscribe to reactions table updates
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

  // Toggle emoji reaction
  const handleToggleReaction = async (messageId: string, emoji: string) => {
    setActiveReactionPickerMsgId(null);
    const supabase = createClient();

    const msgReactions = reactionsMap[messageId] || [];
    const existingMyReaction = msgReactions.find(
      (r) => r.user_id === currentUser.id && r.emoji === emoji
    );

    if (existingMyReaction) {
      // Optimistically remove reaction
      setReactionsMap((prev) => ({
        ...prev,
        [messageId]: (prev[messageId] || []).filter((r) => r.id !== existingMyReaction.id),
      }));
      await supabase.from("event_message_reactions").delete().eq("id", existingMyReaction.id);
    } else {
      // Remove previous reaction if user reacted with different emoji
      const existingOther = msgReactions.find((r) => r.user_id === currentUser.id);
      if (existingOther) {
        await supabase.from("event_message_reactions").delete().eq("id", existingOther.id);
      }

      // Optimistically add new reaction
      const tempId = `temp-${Date.now()}`;
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

  // Touch handlers for mobile long-press
  const handleTouchStart = (msgId: string) => {
    touchTimerRef.current = setTimeout(() => {
      setActiveReactionPickerMsgId(msgId);
    }, 350);
  };

  const handleTouchEnd = () => {
    if (touchTimerRef.current) clearTimeout(touchTimerRef.current);
  };

  // Handle typing broadcast trigger
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

    // Stop typing broadcast immediately
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
      toast.error("Failed to send message: " + error.message);
    } else if (newMsg) {
      setMessages((prev) => {
        if (prev.some((m) => m.id === newMsg.id)) return prev;
        return [...prev, newMsg];
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
              title: `New message in ${eventTitle}`,
              body: `${currentUser.name}: ${trimmed}`,
              url: `/events/${eventId}/chat`,
              eventId: eventId,
            }),
          }).catch((err) => console.error("Push notification error:", err));
        }
      });
    }
  }

  // Format typing users text
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
    <div className="max-w-4xl mx-auto px-4 py-4 h-[calc(100vh-4rem)] flex flex-col bg-background">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-3 border-b shrink-0">
        <div className="flex items-center gap-3">
          <Link
            href={`/events/${eventId}`}
            className="p-2 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>

          <div>
            <h1 className="text-base sm:text-lg font-bold line-clamp-1">{eventTitle}</h1>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Users className="h-3.5 w-3.5" /> Event Group Chat
            </p>
          </div>
        </div>

        <Link href={`/events/${eventId}/attendees`}>
          <Button variant="outline" size="sm" className="gap-1.5 text-xs rounded-xl">
            <Users className="h-3.5 w-3.5" /> Attendees
          </Button>
        </Link>
      </div>

      {/* Messages Feed */}
      <div className="flex-1 overflow-y-auto pr-2 space-y-4 min-h-0 py-3">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground p-6">
            <MessageSquare className="h-12 w-12 opacity-20 mb-3" />
            <p className="font-medium text-sm">No messages yet</p>
            <p className="text-xs mt-1">Be the first to say hello to event attendees!</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.sender_id === currentUser.id;
            const senderName =
              msg.sender?.full_name ||
              msg.sender?.display_name ||
              msg.sender?.username ||
              (isMe ? currentUser.name : "Attendee");

            const timeStr = safeFormatDate(msg.created_at, "h:mm a");
            const msgRxList = reactionsMap[msg.id] || [];

            // Group reaction counts
            const rxCounts: Record<string, number> = {};
            msgRxList.forEach((r) => {
              rxCounts[r.emoji] = (rxCounts[r.emoji] || 0) + 1;
            });

            return (
              <div
                key={msg.id}
                className={`relative group flex gap-2.5 sm:gap-3 ${
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
                  className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden text-xs font-bold text-primary border cursor-pointer hover:ring-2 hover:ring-primary/40 transition-all self-end mb-1"
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
                  className={`max-w-[85%] sm:max-w-[70%] space-y-1 flex flex-col ${
                    isMe ? "items-end" : "items-start"
                  }`}
                >
                  <div className="flex items-center gap-2 px-1">
                    <span
                      onClick={() => {
                        setSelectedUserId(msg.sender_id);
                        setIsProfileModalOpen(true);
                      }}
                      className="text-xs font-semibold text-muted-foreground hover:text-primary cursor-pointer transition-colors"
                    >
                      {isMe ? "You" : senderName}
                    </span>
                    <span className="text-[10px] text-muted-foreground/70">{timeStr}</span>
                  </div>

                  {/* Floating 6 Emoji Reaction Picker Bar */}
                  {activeReactionPickerMsgId === msg.id && (
                    <div
                      className={`flex items-center gap-1.5 p-1.5 bg-card/95 backdrop-blur-md border border-border shadow-xl rounded-full z-20 animate-in fade-in zoom-in-95 duration-150 ${
                        isMe ? "self-end" : "self-start"
                      }`}
                    >
                      {EMOJI_OPTIONS.map((emoji) => {
                        const hasReacted = msgRxList.some(
                          (r) => r.user_id === currentUser.id && r.emoji === emoji
                        );
                        return (
                          <button
                            key={emoji}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleReaction(msg.id, emoji);
                            }}
                            className={`text-lg sm:text-xl p-1 sm:p-1.5 hover:scale-125 active:scale-95 transition-transform rounded-full ${
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
                  <div className="relative group/bubble flex items-center gap-1.5 max-w-full">
                    <button
                      onClick={() =>
                        setActiveReactionPickerMsgId(
                          activeReactionPickerMsgId === msg.id ? null : msg.id
                        )
                      }
                      className={`opacity-0 group-hover/bubble:opacity-100 p-1 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-all shrink-0 ${
                        isMe ? "order-first" : "order-last"
                      }`}
                      title="React to message"
                    >
                      <Smile className="h-4 w-4" />
                    </button>

                    {/* Compact w-fit Bubble */}
                    <div
                      className={`w-fit inline-block px-3.5 py-2 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap break-words ${
                        isMe
                          ? "bg-primary text-primary-foreground rounded-tr-xs shadow-xs"
                          : "bg-card text-foreground rounded-tl-xs border shadow-xs"
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
                          (r) => r.user_id === currentUser.id && r.emoji === emoji
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
                            title="Click to see who reacted"
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
      <div className="h-6 shrink-0 flex items-center px-2">
        {typingText ? (
          <p className="text-xs text-primary font-medium italic animate-pulse flex items-center gap-1.5">
            <span className="inline-block w-2 h-2 rounded-full bg-primary animate-ping" />
            {typingText}
          </p>
        ) : null}
      </div>

      {/* Input Box */}
      <form onSubmit={handleSendMessage} className="pt-2 border-t shrink-0 flex gap-2">
        <Input
          value={inputContent}
          onChange={handleInputChange}
          placeholder="Type a message to attendees..."
          className="flex-1 bg-card"
          disabled={isSending}
        />
        <Button type="submit" disabled={!inputContent.trim() || isSending}>
          {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </form>

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
