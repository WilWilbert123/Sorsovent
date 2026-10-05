"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { SendHorizonal, Loader2 } from "lucide-react";

export function ChatInput({ 
  conversationId, 
  currentUserId 
}: { 
  conversationId: string;
  currentUserId: string;
}) {
  const [content, setContent] = useState("");
  const [isSending, setIsSending] = useState(false);

  async function handleSend(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!content.trim() || isSending) return;

    setIsSending(true);
    const supabase = createClient();
    
    try {
      await supabase.from("messages").insert({
        conversation_id: conversationId,
        sender_id: currentUserId,
        content: content.trim(),
      });
      
      setContent("");
    } catch (error) {
      console.error("Failed to send message", error);
    } finally {
      setIsSending(false);
    }
  }

  return (
    <form 
      onSubmit={handleSend} 
      className="p-4 border-t bg-muted/30 flex items-center gap-2"
    >
      <input 
        type="text" 
        placeholder="Type a message..." 
        value={content}
        onChange={(e) => setContent(e.target.value)}
        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        disabled={isSending}
      />
      <Button 
        type="submit" 
        size="icon" 
        disabled={!content.trim() || isSending}
        className="shrink-0"
      >
        {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <SendHorizonal className="h-4 w-4" />}
      </Button>
    </form>
  );
}
