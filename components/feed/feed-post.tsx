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
import { PostComments, CommentData } from "@/components/feed/post-comments";
import { ReactionsModal } from "@/components/feed/reactions-modal";
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
  comments?: CommentData[];
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
  const [commentsList, setCommentsList] = useState<CommentData[]>(post.comments || []);
  const [commentCount, setCommentCount] = useState(post.comment_count || 0);
  const [isLoadingComments, setIsLoadingComments] = useState(false);

  // Keep commentsList in sync if post.comments updates from parent
  useEffect(() => {
    if (post.comments) {
      setCommentsList(post.comments);
    }
  }, [post.comments]);

  // Real-time synchronization for comments, replies, and reactions
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase.channel(`post-comments:${post.id}`);

    channel
      .on("broadcast", { event: "new_comment" }, (payload) => {
        const newComm = payload.payload?.comment as CommentData;
        if (newComm && newComm.id) {
          setCommentsList((prev) => {
            if (prev.some((c) => c.id === newComm.id)) return prev;
            return [...prev, newComm];
          });
          setCommentCount((c) => c + 1);
        }
      })
      .on("broadcast", { event: "comment_like_update" }, (payload) => {
        const { commentId, likeCount, userId, liked } = payload.payload || {};
        if (commentId) {
          setCommentsList((prev) =>
            prev.map((c) => {
              if (c.id !== commentId) return c;
              const isMe = userId === currentUserId;
              return {
                ...c,
                like_count: likeCount,
                liked: isMe ? liked : c.liked,
              };
            })
          );
        }
      })
      .on("broadcast", { event: "comment_update" }, (payload) => {
        const updated = payload.payload?.comment as CommentData;
        if (updated && updated.id) {
          setCommentsList((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
        }
      })
      .on("broadcast", { event: "delete_comment" }, (payload) => {
        const { commentId } = payload.payload || {};
        if (commentId) {
          setCommentsList((prev) =>
            prev.filter((c) => c.id !== commentId && c.parent_id !== commentId)
          );
          setCommentCount((c) => Math.max(0, c - 1));
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [post.id, currentUserId]);

  // Moderation Report Modal & Reactions Modal
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reactionsModalOpen, setReactionsModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const author = post.profiles;
  const displayName = author?.display_name || author?.username || "Mingle Member";
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

    if (nextState) {
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

  // Comment handlers
  const handleCommentAdded = (newComm: CommentData) => {
    setCommentsList((prev) => [...prev, newComm]);
    setCommentCount((c) => c + 1);
  };

  const handleCommentUpdated = (updated: CommentData) => {
    setCommentsList((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
  };

  const handleCommentDeleted = (commentId: string) => {
    // Remove the comment and any child replies if it was a parent comment
    setCommentsList((prev) =>
      prev.filter((c) => c.id !== commentId && c.parent_id !== commentId)
    );
    setCommentCount((c) => Math.max(0, c - 1));
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
        title: `Post by ${displayName} on Mingle`,
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
        className="border border-border/80 dark:border-white/10 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] dark:shadow-[0_4px_20px_-4px_rgba(0,0,0,0.25)] bg-card/95 dark:bg-card/75 backdrop-blur-xl hover:border-primary/25 transition-all rounded-3xl overflow-hidden"
      >
        <CardContent className="p-4 sm:p-5">
          {/* Header Row */}
          <div className="flex items-start justify-between gap-3 mb-3">
            <Link
              href={`/profile/${author?.username || ""}`}
              className="flex items-center gap-3 group min-w-0"
            >
              <Avatar className="h-10 w-10 ring-2 ring-primary/10 shrink-0">
                <AvatarImage src={author?.avatar_url || undefined} alt={displayName} />
                <AvatarFallback className="text-xs font-semibold bg-primary/10 text-primary">
                  {initials}
                </AvatarFallback>
              </Avatar>

              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <p className="font-bold text-sm text-foreground group-hover:text-primary transition-colors truncate">
                    {displayName}
                  </p>
                  {(post.author_role === "SUPER_ADMIN" || post.author_role === "ADMIN") && (
                    <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-full">
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
                className="inline-flex items-center justify-center h-8 w-8 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors cursor-pointer"
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
          <p className="text-sm sm:text-base leading-relaxed text-foreground/90 whitespace-pre-wrap break-words">
            {post.content}
          </p>

          {/* Attached Media */}
          {mediaItems.length > 0 && (
            <div
              className={cn(
                "mt-3.5 rounded-2xl overflow-hidden gap-2",
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
                  className="relative group bg-muted/60 rounded-2xl overflow-hidden max-h-96 border border-border/60 shadow-2xs"
                >
                  <img
                    src={url}
                    alt="Post photo"
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-102"
                    loading="lazy"
                  />
                </div>
              ))}
            </div>
          )}

          {/* Location Badge */}
          {post.location_name && (
            <div className="inline-flex items-center gap-1.5 mt-3 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-xs font-semibold shadow-2xs">
              <MapPin className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
              <span>{post.location_name}</span>
            </div>
          )}
        </CardContent>

        {/* Footer Actions */}
        <CardFooter className="px-4 py-2.5 bg-muted/30 dark:bg-muted/15 border-t border-border/50 flex flex-col gap-2.5">
          {/* Social Stats Summary Row (Facebook Style) */}
          {(likeCount > 0 || commentCount > 0) && (
            <div className="flex items-center justify-between w-full text-[11px] text-muted-foreground pb-2 border-b border-border/40 px-1">
              {likeCount > 0 ? (
                <button
                  type="button"
                  onClick={() => setReactionsModalOpen(true)}
                  className="flex items-center gap-1.5 hover:underline cursor-pointer group transition-colors"
                >
                  <div className="flex items-center">
                    <span className="h-4 w-4 rounded-full bg-rose-500 flex items-center justify-center text-white shadow-2xs">
                      <Heart className="h-2.5 w-2.5 fill-white text-white" />
                    </span>
                  </div>
                  <span className="font-semibold text-foreground/80 group-hover:text-foreground">
                    {likeCount} {likeCount === 1 ? "reaction" : "reactions"}
                  </span>
                </button>
              ) : (
                <div />
              )}

              {commentCount > 0 && (
                <button
                  type="button"
                  onClick={toggleComments}
                  className="hover:underline cursor-pointer font-medium hover:text-foreground transition-colors"
                >
                  {commentCount} {commentCount === 1 ? "comment" : "comments"}
                </button>
              )}
            </div>
          )}

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
                  "h-8 px-3 gap-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer",
                  liked
                    ? "text-rose-500 hover:text-rose-600 bg-rose-500/10 hover:bg-rose-500/15"
                    : "text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10"
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
                  "h-8 px-3 gap-1.5 rounded-full text-xs font-semibold text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all cursor-pointer",
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
              className="h-8 px-3 gap-1.5 rounded-full text-xs font-semibold text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all cursor-pointer"
            >
              <Share2 className="h-4 w-4" />
              <span className="hidden sm:inline">Share</span>
            </Button>
          </div>

          {/* Interactive Comments Drawer */}
          {showComments && (
            <PostComments
              postId={post.id}
              postAuthorId={post.author_id}
              currentUserId={currentUserId}
              currentUserRole={currentUserRole}
              comments={commentsList}
              onCommentAdded={handleCommentAdded}
              onCommentUpdated={handleCommentUpdated}
              onCommentDeleted={handleCommentDeleted}
              onHideComments={toggleComments}
              isLoading={isLoadingComments}
            />
          )}
        </CardFooter>
      </Card>

      {/* Post Reactions List Modal */}
      <ReactionsModal
        isOpen={reactionsModalOpen}
        onClose={() => setReactionsModalOpen(false)}
        title="People who reacted to this post"
        fetchUrl={`/api/posts/${post.id}/like`}
        totalCount={likeCount}
      />

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
