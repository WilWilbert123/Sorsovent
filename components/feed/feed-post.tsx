"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import {
  Heart,
  MessageCircle,
  Share2,
  MapPin,
  MoreHorizontal,
  Trash2,
  Flag,
  Send,
  ShieldCheck,
  Loader2,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ReportModal } from "@/components/moderation/report-modal";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export interface FeedPostData {
  id: string;
  author_id: string;
  content: string;
  location_name: string | null;
  created_at: string;
  updated_at?: string;
  profiles: {
    id: string;
    username: string | null;
    display_name?: string | null;
    avatar_url: string | null;
  } | null;
  author_role?: string;
  like_count?: number;
  liked?: boolean;
  comment_count?: number;
  comments?: Array<{
    id: string;
    content: string;
    created_at: string;
    profiles?: {
      id: string;
      username: string | null;
      display_name?: string | null;
      avatar_url: string | null;
    } | null;
  }>;
  media_urls?: string[];
  post_media?: Array<{ media_url: string }>;
}

interface FeedPostProps {
  post: FeedPostData;
  currentUserId: string;
  currentUserRole?: string;
  onPostDeleted?: (postId: string) => void;
  onLikeToggled?: (postId: string, liked: boolean, likeCount: number) => void;
}

export function FeedPost({
  post,
  currentUserId,
  currentUserRole = "USER",
  onPostDeleted,
  onLikeToggled,
}: FeedPostProps) {
  const [liked, setLiked] = useState(post.liked || false);
  const [likeCount, setLikeCount] = useState(post.like_count || 0);
  const [isLiking, setIsLiking] = useState(false);

  // Sync state accurately whenever post props change from parent / realtime
  useEffect(() => {
    setLiked(Boolean(post.liked));
  }, [post.liked]);

  useEffect(() => {
    setLikeCount(post.like_count ?? 0);
  }, [post.like_count]);

  useEffect(() => {
    setCommentCount(post.comment_count ?? post.comments?.length ?? 0);
  }, [post.comment_count, post.comments]);

  // Comments state
  const [showComments, setShowComments] = useState(false);
  const [commentsList, setCommentsList] = useState(post.comments || []);
  const [commentCount, setCommentCount] = useState(post.comment_count || 0);
  const [newCommentText, setNewCommentText] = useState("");
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [isLoadingComments, setIsLoadingComments] = useState(false);

  // Moderation Report Modal
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const author = post.profiles;
  const displayName = author?.display_name || author?.username || "Sorsovent Member";
  const initials = displayName
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "U";

  const timeAgo = post.created_at
    ? formatDistanceToNow(new Date(post.created_at), { addSuffix: true })
    : "Just now";

  const mediaItems =
    post.media_urls && post.media_urls.length > 0
      ? post.media_urls
      : post.post_media?.map((m) => m.media_url) || [];

  const isAuthor = author?.id === currentUserId || post.author_id === currentUserId;
  const isAdminOrSuperAdmin =
    currentUserRole === "ADMIN" || currentUserRole === "SUPER_ADMIN";
  const canDelete = isAuthor || isAdminOrSuperAdmin;

  // Like Toggle: 1 like per user strictly enforced
  const handleLikeToggle = async () => {
    if (isLiking) return;
    setIsLiking(true);

    const prevLiked = liked;
    const prevCount = likeCount;

    // Optimistic UI update: toggle between liked and unliked
    const nextLiked = !prevLiked;
    const nextCount = prevLiked ? Math.max(0, prevCount - 1) : prevCount + 1;
    setLiked(nextLiked);
    setLikeCount(nextCount);

    try {
      const res = await fetch(`/api/posts/${post.id}/like`, { method: "POST" });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to update like status");
      }
      setLiked(json.liked);
      setLikeCount(json.like_count);

      if (onLikeToggled) {
        onLikeToggled(post.id, json.liked, json.like_count);
      }

      // Broadcast like update to other tabs/windows
      const supabase = createClient();
      supabase.channel("realtime:home-feed").send({
        type: "broadcast",
        event: "like_update",
        payload: {
          postId: post.id,
          likeCount: json.like_count,
          userId: currentUserId,
          action: json.liked ? "like" : "unlike",
        },
      });

      if (json.liked) {
        toast.success("Post liked!");
      } else {
        toast.info("Post unliked.");
      }
    } catch (err: any) {
      // Revert on error
      setLiked(prevLiked);
      setLikeCount(prevCount);
      toast.error(err.message || "Could not update like.");
    } finally {
      setIsLiking(false);
    }
  };

  // Toggle and load comments
  const toggleComments = async () => {
    const nextState = !showComments;
    setShowComments(nextState);

    if (nextState && commentsList.length === 0) {
      setIsLoadingComments(true);
      try {
        const res = await fetch(`/api/posts/${post.id}/comments`);
        const json = await res.json();
        if (json.success && json.data) {
          setCommentsList(json.data);
          setCommentCount(json.data.length);
        }
      } catch (err) {
        console.error("Failed to load comments:", err);
      } finally {
        setIsLoadingComments(false);
      }
    }
  };

  // Submit comment
  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim() || isSubmittingComment) return;

    setIsSubmittingComment(true);
    try {
      const res = await fetch(`/api/posts/${post.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newCommentText.trim() }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to post comment");
      }

      setCommentsList((prev) => [...prev, json.data]);
      setCommentCount((c) => c + 1);
      setNewCommentText("");
      toast.success("Comment added!");
    } catch (err: any) {
      toast.error(err.message || "Could not add comment");
    } finally {
      setIsSubmittingComment(false);
    }
  };

  // Delete post
  const handleDeletePost = async () => {
    if (!confirm("Are you sure you want to delete this post?")) return;

    setIsDeleting(true);
    const toastId = toast.loading("Deleting post...");

    try {
      const res = await fetch(`/api/posts/${post.id}`, { method: "DELETE" });
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to delete post");
      }

      // Broadcast delete to peer tabs
      const supabase = createClient();
      supabase.channel("realtime:home-feed").send({
        type: "broadcast",
        event: "delete_post",
        payload: { postId: post.id },
      });

      toast.success("Post removed.", { id: toastId });
      if (onPostDeleted) {
        onPostDeleted(post.id);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to delete post", { id: toastId });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleShare = () => {
    const postUrl = `${window.location.origin}/home#post-${post.id}`;
    if (navigator.share) {
      navigator.share({
        title: `Post by ${displayName} on Sorsovent`,
        text: post.content,
        url: postUrl,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(postUrl);
      toast.success("Post link copied to clipboard!");
    }
  };

  return (
    <>
      <Card
        id={`post-${post.id}`}
        className="border border-border/80 shadow-sm bg-card/95 hover:border-primary/20 transition-all rounded-2xl overflow-hidden"
      >
        <CardContent className="p-4 sm:p-5">
          {/* Header Row */}
          <div className="flex items-start justify-between gap-3 mb-3">
            <Link
              href={`/profile/${author?.username || ""}`}
              className="flex items-center gap-3 group min-w-0"
            >
              <Avatar className="h-10 w-10 border border-primary/10 shrink-0">
                <AvatarImage src={author?.avatar_url || undefined} alt={displayName} />
                <AvatarFallback className="text-xs font-semibold bg-primary/10 text-primary">
                  {initials}
                </AvatarFallback>
              </Avatar>

              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <p className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors truncate">
                    {displayName}
                  </p>
                  {(post.author_role === "SUPER_ADMIN" || post.author_role === "ADMIN") && (
                    <span className="inline-flex items-center gap-0.5 text-[10px] font-medium bg-primary/10 text-primary px-1.5 py-0.2 rounded-full">
                      <ShieldCheck className="h-3 w-3" />
                      Admin
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  @{author?.username || "user"} · {timeAgo}
                </p>
              </div>
            </Link>

            {/* Post Options Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger
                className="inline-flex items-center justify-center h-8 w-8 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                aria-label="More options"
              >
                <MoreHorizontal className="h-4 w-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuItem onClick={handleShare} className="text-xs gap-2 cursor-pointer">
                  <Share2 className="h-3.5 w-3.5" />
                  Share Post
                </DropdownMenuItem>

                <DropdownMenuItem
                  onClick={() => setReportModalOpen(true)}
                  className="text-xs gap-2 text-amber-600 dark:text-amber-400 cursor-pointer"
                >
                  <Flag className="h-3.5 w-3.5" />
                  Report Post
                </DropdownMenuItem>

                {canDelete && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={handleDeletePost}
                      disabled={isDeleting}
                      className="text-xs gap-2 text-destructive cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete Post
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Post Content */}
          <p className="text-sm leading-relaxed text-foreground/90 whitespace-pre-wrap break-words">
            {post.content}
          </p>

          {/* Attached Media */}
          {mediaItems.length > 0 && (
            <div
              className={cn(
                "mt-3.5 rounded-xl overflow-hidden gap-1.5",
                mediaItems.length === 1
                  ? "grid grid-cols-1"
                  : mediaItems.length === 2
                  ? "grid grid-cols-2"
                  : "grid grid-cols-2 sm:grid-cols-3"
              )}
            >
              {mediaItems.map((url, i) => (
                <div
                  key={i}
                  className="relative group bg-muted/50 rounded-lg overflow-hidden max-h-96"
                >
                  <img
                    src={url}
                    alt="Post photo"
                    className="w-full h-full object-cover rounded-lg hover:scale-101 transition-transform"
                    loading="lazy"
                  />
                </div>
              ))}
            </div>
          )}

          {/* Location Badge */}
          {post.location_name && (
            <div className="flex items-center gap-1.5 mt-3 text-xs text-muted-foreground font-medium">
              <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
              <span>{post.location_name}</span>
            </div>
          )}
        </CardContent>

        {/* Footer Actions */}
        <CardFooter className="px-4 py-2.5 bg-muted/20 border-t border-border/50 flex flex-col gap-3">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              {/* Like Button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLikeToggle}
                disabled={isLiking}
                title={liked ? "Click to unlike (reduces count by 1)" : "Click to like (adds 1 like)"}
                aria-label={liked ? "Unlike post" : "Like post"}
                className={cn(
                  "h-8 px-3 gap-1.5 rounded-full text-xs font-medium transition-all cursor-pointer",
                  liked
                    ? "text-rose-500 hover:text-rose-600 bg-rose-500/10 hover:bg-rose-500/15"
                    : "text-muted-foreground hover:text-rose-500 hover:bg-rose-500/5"
                )}
              >
                <Heart
                  className={cn(
                    "h-4 w-4 transition-transform",
                    liked && "fill-rose-500 text-rose-500 scale-110"
                  )}
                />
                <span>{likeCount > 0 ? likeCount : "Like"}</span>
              </Button>

              {/* Comment Button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleComments}
                className={cn(
                  "h-8 px-3 gap-1.5 rounded-full text-xs font-medium text-muted-foreground hover:text-primary hover:bg-primary/5",
                  showComments && "text-primary bg-primary/10"
                )}
              >
                <MessageCircle className="h-4 w-4" />
                <span>{commentCount > 0 ? commentCount : "Comment"}</span>
              </Button>
            </div>

            {/* Share Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleShare}
              className="h-8 px-3 gap-1.5 rounded-full text-xs font-medium text-muted-foreground hover:text-primary hover:bg-primary/5"
            >
              <Share2 className="h-4 w-4" />
              <span className="hidden sm:inline">Share</span>
            </Button>
          </div>

          {/* Interactive Comments Drawer */}
          {showComments && (
            <div className="w-full pt-2 border-t border-border/40 space-y-3 animate-in fade-in slide-in-from-top-1">
              {/* Comments List */}
              {isLoadingComments ? (
                <div className="flex justify-center py-3">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              ) : commentsList.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-2">
                  No comments yet. Start the conversation!
                </p>
              ) : (
                <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                  {commentsList.map((comm) => (
                    <div
                      key={comm.id}
                      className="flex gap-2.5 items-start text-xs bg-card/60 p-2.5 rounded-xl border border-border/40"
                    >
                      <Avatar className="h-6 w-6 shrink-0 mt-0.5">
                        <AvatarImage src={comm.profiles?.avatar_url || undefined} />
                        <AvatarFallback className="text-[9px]">
                          {(comm.profiles?.display_name || comm.profiles?.username || "U")[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-foreground">
                            {comm.profiles?.display_name || comm.profiles?.username || "User"}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {comm.created_at
                              ? formatDistanceToNow(new Date(comm.created_at), { addSuffix: true })
                              : ""}
                          </span>
                        </div>
                        <p className="text-muted-foreground/90 mt-0.5 whitespace-pre-wrap">
                          {comm.content}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Add Comment Input */}
              <form onSubmit={handleSubmitComment} className="flex gap-2 items-center">
                <input
                  type="text"
                  placeholder="Write a comment..."
                  value={newCommentText}
                  onChange={(e) => setNewCommentText(e.target.value)}
                  className="flex-1 bg-muted/40 border border-border/60 rounded-full px-3.5 py-1.5 text-xs outline-none focus:border-primary transition-colors"
                  maxLength={500}
                />
                <Button
                  type="submit"
                  size="sm"
                  disabled={!newCommentText.trim() || isSubmittingComment}
                  className="rounded-full h-7 px-3 text-xs gap-1"
                >
                  {isSubmittingComment ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Send className="h-3 w-3" />
                  )}
                  Post
                </Button>
              </form>
            </div>
          )}
        </CardFooter>
      </Card>

      {/* Moderation Report Modal */}
      <ReportModal
        isOpen={reportModalOpen}
        onClose={() => setReportModalOpen(false)}
        renderTrigger={false}
        targetType="post"
        targetId={post.id}
        targetTitle={`Post by ${displayName}`}
      />
    </>
  );
}
