"use client";

import { useState, useRef, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Send, Loader2 } from "lucide-react";
import { sendDirectMessage } from "@/app/actions/conversations";
import { toast } from "sonner";

export function ChatInput({
  conversationId,
  currentUserId,
}: {
  conversationId: string;
  currentUserId: string;
}) {
  const [content, setContent] = useState("");
  const [isSending, setIsSending] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const channelRef = useRef<any>(null);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase.channel(`chat_${conversationId}`, {
      config: { broadcast: { self: false } },
    });
    channel.subscribe();
    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId]);

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    setContent(e.target.value);

    if (channelRef.current) {
      channelRef.current.send({
        type: "broadcast",
        event: "typing",
        payload: { userId: currentUserId, isTyping: true },
      });
    }

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      if (channelRef.current) {
        channelRef.current.send({
          type: "broadcast",
          event: "typing",
          payload: { userId: currentUserId, isTyping: false },
        });
      }
    }, 1800);
  }

  async function handleSend(e?: React.FormEvent) {
    if (e) e.preventDefault();
    const trimmed = content.trim();
    if (!trimmed || isSending) return;

    setContent("");
    setIsSending(true);

    if (channelRef.current) {
      channelRef.current.send({
        type: "broadcast",
        event: "typing",
        payload: { userId: currentUserId, isTyping: false },
      });
    }

    // Optimistic UI message
    const tempId = `temp-${Date.now()}`;
    const optimisticMsg = {
      id: tempId,
      conversation_id: conversationId,
      sender_id: currentUserId,
      content: trimmed,
      created_at: new Date().toISOString(),
    };

    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("mingle:dm-optimistic", {
          detail: { conversationId, message: optimisticMsg },
        })
      );
    }

    try {
      const res = await sendDirectMessage({
        conversationId,
        content: trimmed,
      });
      if (res?.message && typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("mingle:dm-confirmed", {
            detail: { conversationId, tempId, message: res.message },
          })
        );
      }
    } catch (error: any) {
      console.error("Failed to send message via action, trying fallback", error);
      try {
        const supabase = createClient();
        const { data: inserted } = await supabase
          .from("messages")
          .insert({
            conversation_id: conversationId,
            sender_id: currentUserId,
            content: trimmed,
          })
          .select()
          .single();

        if (inserted && typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("mingle:dm-confirmed", {
              detail: { conversationId, tempId, message: inserted },
            })
          );
        }

        // Trigger push notification to other conversation participant(s)
        const { data: members } = await supabase
          .from("conversation_members")
          .select("user_id")
          .eq("conversation_id", conversationId)
          .neq("user_id", currentUserId);

        const targetUserIds = members?.map((m) => m.user_id) || [];
        if (targetUserIds.length > 0) {
          fetch("/api/notifications/send-push", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              targetUserIds,
              title: "New Direct Message 💬",
              body: trimmed.slice(0, 100),
              url: `/messages/${conversationId}`,
              type: "direct_message",
            }),
          }).catch(() => {});
        }
      } catch {
        toast.error("Failed to send message");
      }
    } finally {
      setIsSending(false);
    }
  }

  return (
    <form
      onSubmit={handleSend}
      className="p-2.5 sm:p-3 border-t bg-background/95 backdrop-blur-md flex items-center gap-2 shrink-0"
    >
      <input
        type="text"
        placeholder="Write a message..."
        value={content}
        onChange={handleInputChange}
        className="flex h-10 w-full rounded-full border border-border/80 bg-muted/40 px-4 py-2 text-base sm:text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
      />
      <Button
        type="submit"
        size="icon"
        disabled={!content.trim() || isSending}
        className="h-10 w-10 rounded-full bg-gradient-to-r from-[#FF5E3A] to-[#FF3366] text-white border-0 shrink-0 shadow-xs cursor-pointer"
      >
        {isSending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Send className="h-4 w-4" />
        )}
      </Button>
    </form>
  );
}
