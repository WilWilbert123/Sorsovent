"use client";

import { useState } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Heart, MessageCircle, Share2, MapPin, MoreHorizontal } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface PostProfile {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
}

interface Post {
  id: string;
  content: string;
  media_urls: string[] | null;
  location_name: string | null;
  location_lat: number | null;
  location_lng: number | null;
  created_at: string;
  like_count: number;
  comment_count: number;
  profiles: PostProfile;
}

interface FeedPostProps {
  post: Post;
  currentUserId: string;
}

export function FeedPost({ post, currentUserId }: FeedPostProps) {
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(post.like_count || 0);

  const author = post.profiles;
  const displayName = author?.full_name || author?.username || "User";
  const initials = displayName
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const timeAgo = post.created_at
    ? formatDistanceToNow(new Date(post.created_at), { addSuffix: true })
    : "";

  async function handleLike() {
    const supabase = createClient();
    if (liked) {
      setLiked(false);
      setLikeCount((c) => c - 1);
      await supabase
        .from("post_likes")
        .delete()
        .eq("post_id", post.id)
        .eq("user_id", currentUserId);
    } else {
      setLiked(true);
      setLikeCount((c) => c + 1);
      const { error } = await supabase.from("post_likes").insert({
        post_id: post.id,
        user_id: currentUserId,
      });
      if (error) {
        setLiked(false);
        setLikeCount((c) => c - 1);
        toast.error("Failed to like post.");
      }
    }
  }

  function handleShare() {
    navigator.share?.({
      title: `Post by ${displayName}`,
      text: post.content,
      url: `${window.location.origin}/share/post/${post.id}`,
    }) ?? navigator.clipboard.writeText(`${window.location.origin}/share/post/${post.id}`);
    toast.success("Link copied!");
  }

  return (
    <Card className="border shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="pt-4">
        {/* Author Row */}
        <div className="flex items-start justify-between mb-3">
          <Link
            href={`/profile/${author?.username}`}
            className="flex items-center gap-3 group"
          >
            <Avatar className="h-10 w-10">
              <AvatarImage src={author?.avatar_url || undefined} alt={displayName} />
              <AvatarFallback className="text-xs">{initials}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold text-sm group-hover:underline">{displayName}</p>
              <p className="text-xs text-muted-foreground">
                @{author?.username} · {timeAgo}
              </p>
            </div>
          </Link>
          <DropdownMenu>
            <DropdownMenuTrigger
              className="inline-flex items-center justify-center h-8 w-8 rounded-lg hover:bg-accent transition-colors"
              aria-label="More options"
            >
              <MoreHorizontal className="h-4 w-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleShare}>Share</DropdownMenuItem>
              {author?.id === currentUserId && (
                <DropdownMenuItem className="text-destructive">Delete</DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Content */}
        <p className="text-sm leading-relaxed whitespace-pre-wrap">{post.content}</p>

        {/* Media */}
        {post.media_urls && post.media_urls.length > 0 && (
          <div className="mt-3 rounded-xl overflow-hidden grid grid-cols-1 gap-1">
            {post.media_urls.map((url, i) => (
              <img
                key={i}
                src={url}
                alt="Post media"
                className="w-full object-cover max-h-96"
              />
            ))}
          </div>
        )}

        {/* Location */}
        {post.location_name && (
          <div className="flex items-center gap-1.5 mt-3 text-xs text-muted-foreground">
            <MapPin className="h-3.5 w-3.5 text-primary" />
            <span>{post.location_name}</span>
          </div>
        )}
      </CardContent>

      {/* Actions */}
      <CardFooter className="pt-0 pb-3 border-t mt-1">
        <div className="flex gap-1 w-full pt-2">
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "gap-2 flex-1 text-muted-foreground",
              liked && "text-rose-500 hover:text-rose-600"
            )}
            onClick={handleLike}
          >
            <Heart className={cn("h-4 w-4", liked && "fill-current")} />
            <span className="text-xs">{likeCount > 0 ? likeCount : ""}</span>
          </Button>
          <Link href={`/posts/${post.id}`} className="flex-1">
            <Button variant="ghost" size="sm" className="gap-2 w-full text-muted-foreground">
              <MessageCircle className="h-4 w-4" />
              <span className="text-xs">{post.comment_count > 0 ? post.comment_count : ""}</span>
            </Button>
          </Link>
          <Button
            variant="ghost"
            size="sm"
            className="gap-2 flex-1 text-muted-foreground"
            onClick={handleShare}
          >
            <Share2 className="h-4 w-4" />
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
