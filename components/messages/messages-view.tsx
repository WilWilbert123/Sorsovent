"use client";

import { useState } from "react";
import Link from "next/link";
import { MessageSquare, Users, Calendar, Plus, ChevronRight, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getCategoryEmoji } from "@/lib/map/emoji";
import { safeFormatDate } from "@/lib/utils";

interface EventGroupChat {
  id: string;
  title: string;
  category?: string | null;
  location_name?: string | null;
  latestMessage?: {
    content: string;
    created_at: string;
    senderName?: string;
  } | null;
  isCreator: boolean;
}

interface MessagesViewProps {
  eventChats: EventGroupChat[];
  directMessages?: any[];
}

export function MessagesView({ eventChats, directMessages = [] }: MessagesViewProps) {
  const [activeTab, setActiveTab] = useState<"event_chats" | "direct">("event_chats");

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 min-h-[calc(100vh-5rem)] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Messages</h1>
          <p className="text-sm text-muted-foreground">Direct messages and event group chats</p>
        </div>
        <Link href="/explore">
          <Button size="sm" className="gap-2">
            <Plus className="h-4 w-4" /> Find Events
          </Button>
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b mb-6 pb-2">
        <button
          onClick={() => setActiveTab("event_chats")}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${
            activeTab === "event_chats"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
        >
          <Users className="h-4 w-4" />
          Event Group Chats ({eventChats.length})
        </button>
        <button
          onClick={() => setActiveTab("direct")}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${
            activeTab === "direct"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
        >
          <MessageSquare className="h-4 w-4" />
          Direct Messages ({directMessages.length})
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === "event_chats" && (
        <div className="flex-1">
          {eventChats.length === 0 ? (
            <div className="text-center py-16 px-4 border rounded-2xl bg-card shadow-sm">
              <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 text-primary">
                <Users className="h-8 w-8" />
              </div>
              <h3 className="text-lg font-semibold mb-1">No Event Chats Yet</h3>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto mb-6">
                When you create an event or click "I'm Going" to join an event, its group chat will automatically appear here.
              </p>
              <Link href="/events">
                <Button>Browse Events to Join</Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {eventChats.map((chat) => {
                const emoji = getCategoryEmoji(chat.category || undefined, chat.title);
                const timeAgo = chat.latestMessage?.created_at
                  ? safeFormatDate(chat.latestMessage.created_at, "h:mm a")
                  : "";

                return (
                  <Link key={chat.id} href={`/events/${chat.id}/chat`}>
                    <div className="flex items-center gap-4 p-4 rounded-2xl border bg-card hover:border-primary/50 hover:shadow-md transition-all group">
                      <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-2xl shrink-0 group-hover:scale-105 transition-transform border border-primary/20">
                        {emoji}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <h3 className="font-semibold text-sm sm:text-base line-clamp-1 group-hover:text-primary transition-colors flex items-center gap-2">
                            {chat.title}
                            {chat.isCreator && (
                              <Badge variant="outline" className="text-[10px] py-0 px-1.5 border-primary/40 text-primary">
                                Organizer
                              </Badge>
                            )}
                          </h3>
                          {timeAgo && (
                            <span className="text-xs text-muted-foreground shrink-0 flex items-center gap-1">
                              <Clock className="h-3 w-3" /> {timeAgo}
                            </span>
                          )}
                        </div>

                        <p className="text-xs sm:text-sm text-muted-foreground line-clamp-1">
                          {chat.latestMessage ? (
                            <span>
                              <strong className="text-foreground/80 font-medium">
                                {chat.latestMessage.senderName}:{" "}
                              </strong>
                              {chat.latestMessage.content}
                            </span>
                          ) : (
                            <span className="italic text-muted-foreground/70">
                              No messages yet. Tap to start chatting with attendees!
                            </span>
                          )}
                        </p>
                      </div>

                      <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all shrink-0" />
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === "direct" && (
        <div className="flex-1">
          {directMessages.length === 0 ? (
            <div className="text-center py-16 px-4 border rounded-2xl bg-card shadow-sm">
              <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 text-primary">
                <MessageSquare className="h-8 w-8" />
              </div>
              <h3 className="text-lg font-semibold mb-1">No Direct Messages</h3>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto mb-6">
                Start a conversation with attendees or creators in Sorsogon.
              </p>
              <Link href="/explore">
                <Button variant="outline">Explore Community</Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Direct Messages List */}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
