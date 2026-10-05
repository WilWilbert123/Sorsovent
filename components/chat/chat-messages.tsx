"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { format } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export function ChatMessages({ 
  initialMessages, 
  conversationId, 
  currentUserId 
}: { 
  initialMessages: any[];
  conversationId: string;
  currentUserId: string;
}) {
  const [messages, setMessages] = useState(initialMessages);
  const bottomRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    // Scroll to bottom on load
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const supabase = createClient();
    
    // Subscribe to new messages
    const channel = supabase
      .channel(`chat_${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`
        },
        async (payload) => {
          // Fetch the author details for the new message
          const { data: author } = await supabase
            .from("profiles")
            .select("username, full_name, avatar_url")
            .eq("id", payload.new.sender_id)
            .single();
            
          const newMessage = {
            ...payload.new,
            profiles: author
          };
          
          setMessages(prev => [...prev, newMessage]);
        }
      )
      .subscribe();
      
    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId]);

  if (messages.length === 0) {
    return (
      <div className="flex-1 overflow-y-auto p-4 flex flex-col justify-end text-center">
        <p className="text-sm text-muted-foreground py-8">
          This is the start of your conversation.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {messages.map((msg, i) => {
        const isMine = msg.sender_id === currentUserId;
        const author = msg.profiles;
        
        // Simple logic to show name only if it's not the same sender as the previous message
        const prevMsg = i > 0 ? messages[i - 1] : null;
        const showHeader = !prevMsg || prevMsg.sender_id !== msg.sender_id;
        
        return (
          <div key={msg.id} className={`flex flex-col ${isMine ? "items-end" : "items-start"}`}>
            {showHeader && !isMine && (
              <div className="flex items-center gap-2 mb-1 pl-1">
                <Avatar className="h-6 w-6">
                  <AvatarImage src={author?.avatar_url || undefined} />
                  <AvatarFallback className="text-[10px]">{(author?.full_name || author?.username || "U")[0]?.toUpperCase()}</AvatarFallback>
                </Avatar>
                <span className="text-xs text-muted-foreground font-medium">
                  {author?.full_name || author?.username}
                </span>
                <span className="text-[10px] text-muted-foreground/60 ml-1">
                  {format(new Date(msg.created_at), "h:mm a")}
                </span>
              </div>
            )}
            
            {showHeader && isMine && (
              <div className="flex items-center gap-2 mb-1 pr-1">
                <span className="text-[10px] text-muted-foreground/60 mr-1">
                  {format(new Date(msg.created_at), "h:mm a")}
                </span>
                <span className="text-xs text-muted-foreground font-medium">
                  You
                </span>
              </div>
            )}
            
            <div 
              className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${
                isMine 
                  ? "bg-primary text-primary-foreground rounded-tr-sm" 
                  : "bg-muted text-foreground rounded-tl-sm"
              }`}
            >
              {msg.content}
            </div>
          </div>
        );
      })}
      <div ref={bottomRef} />
    </div>
  );
}
