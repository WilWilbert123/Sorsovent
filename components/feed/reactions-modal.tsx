"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Heart, Loader2, User } from "lucide-react";

interface ReactionUser {
  id: string;
  created_at?: string;
  user: {
    id: string;
    username: string | null;
    display_name?: string | null;
    full_name?: string | null;
    avatar_url: string | null;
  } | null;
}

interface ReactionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  fetchUrl: string;
  totalCount?: number;
}

export function ReactionsModal({
  isOpen,
  onClose,
  title = "People who reacted",
  fetchUrl,
  totalCount = 0,
}: ReactionsModalProps) {
  const [users, setUsers] = useState<ReactionUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !fetchUrl) return;

    let isMounted = true;
    setIsLoading(true);
    setError(null);

    fetch(fetchUrl)
      .then((res) => res.json())
      .then((json) => {
        if (!isMounted) return;
        if (json.success && json.data) {
          setUsers(json.data);
        } else {
          setError(json.error || "Failed to load reactions");
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(err.message || "Could not load reactions");
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, fetchUrl]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md w-full p-0 overflow-hidden rounded-2xl gap-0 bg-card border border-border/70 shadow-2xl">
        <DialogHeader className="p-4 border-b border-border/50 flex flex-row items-center justify-between space-y-0">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-full bg-rose-500/15 flex items-center justify-center">
              <Heart className="h-4 w-4 fill-rose-500 text-rose-500" />
            </div>
            <div>
              <DialogTitle className="text-sm font-bold text-foreground">
                {title}
              </DialogTitle>
              <p className="text-[11px] text-muted-foreground">
                {totalCount > 0 ? `${totalCount} reaction${totalCount === 1 ? "" : "s"}` : "Reactions list"}
              </p>
            </div>
          </div>
        </DialogHeader>

        {/* Content list */}
        <div className="max-h-[360px] overflow-y-auto p-3 space-y-1 divide-y divide-border/20">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-10 gap-2 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <span className="text-xs">Loading reactions...</span>
            </div>
          ) : error ? (
            <div className="text-center py-8 text-xs text-rose-500">
              {error}
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-8 text-xs text-muted-foreground">
              No reactions yet.
            </div>
          ) : (
            users.map((item) => {
              const u = item.user;
              const name = u?.display_name || u?.full_name || u?.username || "Mingle Member";
              const username = u?.username || "";
              const initials = name[0]?.toUpperCase() || "U";

              return (
                <div
                  key={item.id}
                  className="pt-2 first:pt-0 flex items-center justify-between gap-3 p-2 rounded-xl hover:bg-muted/40 transition-colors"
                >
                  <Link
                    href={`/profile/${username}`}
                    onClick={onClose}
                    className="flex items-center gap-3 min-w-0 flex-1 group"
                  >
                    <div className="relative shrink-0">
                      <Avatar className="h-10 w-10 ring-1 ring-border/50">
                        <AvatarImage src={u?.avatar_url || undefined} alt={name} />
                        <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      <div className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full bg-card border border-border flex items-center justify-center shadow-xs">
                        <Heart className="h-2.5 w-2.5 fill-rose-500 text-rose-500" />
                      </div>
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-foreground group-hover:text-primary transition-colors truncate">
                        {name}
                      </p>
                      {username && (
                        <p className="text-[11px] text-muted-foreground truncate">
                          @{username}
                        </p>
                      )}
                    </div>
                  </Link>

                  <Link href={`/profile/${username}`} onClick={onClose}>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 px-3 text-[11px] rounded-full gap-1 hover:bg-primary/10 hover:text-primary border-border/80"
                    >
                      <User className="h-3 w-3" />
                      Profile
                    </Button>
                  </Link>
                </div>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
