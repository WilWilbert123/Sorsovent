"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { UserProfileModal } from "@/components/profile/user-profile-modal";

export interface ReactionDetail {
  id: string;
  message_id: string;
  user_id: string;
  emoji: string;
  user?: {
    id: string;
    display_name?: string | null;
    full_name?: string | null;
    username?: string | null;
    avatar_url?: string | null;
  } | null;
}

interface ReactionUsersModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reactions: ReactionDetail[];
}

export function ReactionUsersModal({
  open,
  onOpenChange,
  reactions = [],
}: ReactionUsersModalProps) {
  const [selectedEmojiFilter, setSelectedEmojiFilter] = useState<string>("all");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  if (!open) return null;

  // Group reaction counts by emoji
  const emojiCounts: Record<string, number> = {};
  reactions.forEach((r) => {
    emojiCounts[r.emoji] = (emojiCounts[r.emoji] || 0) + 1;
  });

  const uniqueEmojis = Object.keys(emojiCounts);

  const filteredReactions =
    selectedEmojiFilter === "all"
      ? reactions
      : reactions.filter((r) => r.emoji === selectedEmojiFilter);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md bg-card border-border rounded-2xl p-5">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center justify-between">
              <span>Message Reactions</span>
              <Badge variant="secondary" className="text-xs">
                {reactions.length} {reactions.length === 1 ? "reaction" : "reactions"}
              </Badge>
            </DialogTitle>
          </DialogHeader>

          {/* Emoji Filter Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-2 border-b">
            <button
              onClick={() => setSelectedEmojiFilter("all")}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors flex items-center gap-1 shrink-0 ${
                selectedEmojiFilter === "all"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              All ({reactions.length})
            </button>
            {uniqueEmojis.map((emoji) => (
              <button
                key={emoji}
                onClick={() => setSelectedEmojiFilter(emoji)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors flex items-center gap-1 shrink-0 ${
                  selectedEmojiFilter === emoji
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                <span>{emoji}</span>
                <span>{emojiCounts[emoji]}</span>
              </button>
            ))}
          </div>

          {/* User list */}
          <div className="max-h-64 overflow-y-auto space-y-2 py-2 pr-1">
            {filteredReactions.length === 0 ? (
              <p className="text-xs text-center text-muted-foreground py-6">
                No reactions for this filter.
              </p>
            ) : (
              filteredReactions.map((r) => {
                const name =
                  r.user?.full_name ||
                  r.user?.display_name ||
                  r.user?.username ||
                  "User";
                const username = r.user?.username || "user";

                return (
                  <div
                    key={r.id}
                    onClick={() => {
                      setSelectedUserId(r.user_id);
                      setIsProfileOpen(true);
                    }}
                    className="flex items-center justify-between p-2 rounded-xl hover:bg-muted/60 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar className="h-9 w-9 border shrink-0">
                        <AvatarImage src={r.user?.avatar_url || undefined} alt={name} />
                        <AvatarFallback className="font-bold text-xs bg-primary/10 text-primary">
                          {name[0]?.toUpperCase() || "U"}
                        </AvatarFallback>
                      </Avatar>

                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-foreground truncate">
                          {name}
                        </p>
                        <p className="text-[10px] text-muted-foreground truncate">
                          @{username}
                        </p>
                      </div>
                    </div>

                    <span className="text-lg shrink-0 px-2">{r.emoji}</span>
                  </div>
                );
              })
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Profile Modal preview when clicking a user in reactions list */}
      <UserProfileModal
        userId={selectedUserId}
        open={isProfileOpen}
        onOpenChange={setIsProfileOpen}
      />
    </>
  );
}
