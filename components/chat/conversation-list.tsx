"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatRelativeTime } from "@/lib/utils/format";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export function ConversationList({ conversations }: { conversations: any[] }) {
  if (!conversations || conversations.length === 0) {
    return (
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        <p className="text-sm text-muted-foreground text-center py-8">Select a conversation or start a new one.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {conversations.map((convo) => (
        <Link 
          key={convo.conversation_id} 
          href={`/messages/${convo.conversation_id}`}
          className="flex items-center gap-4 p-4 border-b hover:bg-muted/50 transition-colors"
        >
          <Avatar className="h-12 w-12 border">
             <AvatarFallback>C</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <h4 className="font-medium truncate text-sm">Conversation #{convo.conversation_id.slice(0, 4)}</h4>
              <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                {formatRelativeTime(convo.conversations?.updated_at || convo.conversations?.created_at)}
              </span>
            </div>
            <p className="text-sm text-muted-foreground truncate">
              Click to view messages
            </p>
          </div>
        </Link>
      ))}
    </div>
  );
}
