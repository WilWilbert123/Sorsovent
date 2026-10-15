"use client";

import { useState } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import {
  Heart,
  CornerDownRight,
  MoreHorizontal,
  Edit2,
  Trash2,
  EyeOff,
  Eye,
  Send,
  Loader2,
  X,
  Check,
  ChevronUp,
} from "lucide-react";
import { ReactionsModal } from "@/components/feed/reactions-modal";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export interface CommentData {
  id: string;
  post_id: string;
  author_id: string;
  parent_id?: string | null;
  content: string;
  is_hidden?: boolean;
  like_count?: number;
  liked?: boolean;
  created_at: string;
  updated_at?: string;
  profiles?: {
    id: string;
    username: string | null;
    display_name?: string | null;
    avatar_url: string | null;
  } | null;
}

interface PostCommentsProps {
  postId: string;
  postAuthorId: string;
  currentUserId: string;
  currentUserRole?: string;
  comments: CommentData[];
  onCommentAdded?: (newComment: CommentData) => void;
  onCommentUpdated?: (updated: CommentData) => void;
  onCommentDeleted?: (commentId: string) => void;
  onHideComments?: () => void;
  isLoading?: boolean;
}

export function PostComments({
  postId,
  postAuthorId,
  currentUserId,
  currentUserRole = "USER",
  comments,
  onCommentAdded,
  onCommentUpdated,
  onCommentDeleted,
  onHideComments,
  isLoading = false,
}: PostCommentsProps) {
  const [commentText, setCommentText] = useState("");
  const [replyingTo, setReplyingTo] = useState<{
    id: string;
    username: string;
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [reactionsComment, setReactionsComment] = useState<{ id: string; count: number } | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  // Group top-level comments and their replies
  const topLevelComments = comments.filter((c) => !c.parent_id);
  const repliesByParentId = new Map<string, CommentData[]>();

  for (const c of comments) {
    if (c.parent_id) {
      const existing = repliesByParentId.get(c.parent_id) || [];
      existing.push(c);
      repliesByParentId.set(c.parent_id, existing);
    }
  }

  // Submit comment or reply
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/posts/${postId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: commentText.trim(),
          parent_id: replyingTo?.id || null,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to post comment");
      }

      setCommentText("");
      setReplyingTo(null);
      if (onCommentAdded) {
        onCommentAdded(json.data);
      }

      // Broadcast new comment/reply to all connected clients
      try {
        const supabase = createClient();
        supabase.channel(`post-comments:${postId}`).send({
          type: "broadcast",
          event: "new_comment",
          payload: { comment: json.data },
        });
      } catch (err) {
        console.warn("Realtime broadcast comment error:", err);
      }

      toast.success(replyingTo ? "Reply posted!" : "Comment posted!");
    } catch (err: any) {
      toast.error(err.message || "Failed to post comment");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Toggle Like on a comment
  const handleToggleLike = async (comment: CommentData) => {
    if (!currentUserId) {
      toast.error("Please sign in to like comments");
      return;
    }

    const optimisticLiked = !comment.liked;
    const optimisticCount = Math.max(
      0,
      (comment.like_count || 0) + (optimisticLiked ? 1 : -1)
    );

    // Optimistically update
    if (onCommentUpdated) {
      onCommentUpdated({
        ...comment,
        liked: optimisticLiked,
        like_count: optimisticCount,
      });
    }

    try {
      const res = await fetch(`/api/posts/${postId}/comments/${comment.id}/like`, {
        method: "POST",
      });
      const json = await res.json();
      if (json.success && json.data && onCommentUpdated) {
        onCommentUpdated({
          ...comment,
          liked: json.data.liked,
          like_count: json.data.like_count,
        });

        // Broadcast like update to all connected clients
        try {
          const supabase = createClient();
          supabase.channel(`post-comments:${postId}`).send({
            type: "broadcast",
            event: "comment_like_update",
            payload: {
              commentId: comment.id,
              likeCount: json.data.like_count,
              userId: currentUserId,
              liked: json.data.liked,
            },
          });
        } catch (bErr) {
          console.warn("Realtime broadcast comment like error:", bErr);
        }
      }
    } catch {
      // Revert on error
      if (onCommentUpdated) {
        onCommentUpdated(comment);
      }
    }
  };

  // Save edited comment
  const handleSaveEdit = async (commentId: string) => {
    if (!editText.trim() || isSavingEdit) return;

    setIsSavingEdit(true);
    try {
      const res = await fetch(`/api/posts/${postId}/comments/${commentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: editText.trim() }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to edit comment");
      }

      setEditingCommentId(null);
      setEditText("");
      if (onCommentUpdated) {
        onCommentUpdated(json.data);
      }

      // Broadcast comment update
      try {
        const supabase = createClient();
        supabase.channel(`post-comments:${postId}`).send({
          type: "broadcast",
          event: "comment_update",
          payload: { comment: json.data },
        });
      } catch (bErr) {
        console.warn("Realtime broadcast comment update error:", bErr);
      }

      toast.success("Comment updated!");
    } catch (err: any) {
      toast.error(err.message || "Failed to update comment");
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Hide or unhide comment (post owner or admin)
  const handleToggleHide = async (comment: CommentData) => {
    const newHiddenState = !comment.is_hidden;
    try {
      const res = await fetch(`/api/posts/${postId}/comments/${comment.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_hidden: newHiddenState }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to update comment status");
      }

      if (onCommentUpdated) {
        onCommentUpdated(json.data);
      }

      // Broadcast comment hide state
      try {
        const supabase = createClient();
        supabase.channel(`post-comments:${postId}`).send({
          type: "broadcast",
          event: "comment_update",
          payload: { comment: json.data },
        });
      } catch (bErr) {
        console.warn("Realtime broadcast comment hide error:", bErr);
      }

      toast.success(newHiddenState ? "Comment hidden from viewers." : "Comment restored.");
    } catch (err: any) {
      toast.error(err.message || "Failed to hide comment");
    }
  };

  // Delete comment (author, post owner, or admin)
  const handleDeleteComment = async (commentId: string) => {
    if (!confirm("Are you sure you want to delete this comment?")) return;

    try {
      const res = await fetch(`/api/posts/${postId}/comments/${commentId}`, {
        method: "DELETE",
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to delete comment");
      }

      if (onCommentDeleted) {
        onCommentDeleted(commentId);
      }

      // Broadcast comment deletion
      try {
        const supabase = createClient();
        supabase.channel(`post-comments:${postId}`).send({
          type: "broadcast",
          event: "delete_comment",
          payload: { commentId },
        });
      } catch (bErr) {
        console.warn("Realtime broadcast comment delete error:", bErr);
      }

      toast.success("Comment deleted");
    } catch (err: any) {
      toast.error(err.message || "Failed to delete comment");
    }
  };

  // Single Comment Row Item (Used for both root comment and nested reply)
  const renderCommentRow = (
    comm: CommentData,
    isReply = false,
    hasReplies = false,
    repliesCount = 0
  ) => {
    const isCommentAuthor = comm.author_id === currentUserId;
    const isPostOwner = postAuthorId === currentUserId;
    const isAdmin = currentUserRole === "ADMIN" || currentUserRole === "SUPER_ADMIN";
    const canDelete = isCommentAuthor || isPostOwner || isAdmin;
    const canHide = isPostOwner || isAdmin;
    const isEditing = editingCommentId === comm.id;

    const authorName = comm.profiles?.display_name || comm.profiles?.username || "User";
    const isPostAuthor = comm.author_id === postAuthorId;
    const isEdited = Boolean(comm.updated_at && comm.updated_at !== comm.created_at);

    // If hidden and viewer is not post owner or author
    if (comm.is_hidden && !isPostOwner && !isCommentAuthor && !isAdmin) {
      return (
        <div
          key={comm.id}
          className="text-xs text-muted-foreground/75 italic py-1.5 px-3 bg-muted/20 rounded-xl border border-dashed border-border/40"
        >
          This comment has been hidden by the post author.
        </div>
      );
    }

    return (
      <div key={comm.id} className="group/comm relative flex gap-2.5 items-start text-xs">
        {/* Avatar Column with continuous connector stem for parents */}
        <div className="relative shrink-0 mt-0.5">
          <Link href={`/profile/${comm.profiles?.username || ""}`}>
            <Avatar className={cn("ring-1 ring-border/50", isReply ? "h-7 w-7" : "h-8 w-8")}>
              <AvatarImage src={comm.profiles?.avatar_url || undefined} alt={authorName} />
              <AvatarFallback className="text-[10px] bg-primary/10 text-primary font-bold">
                {authorName[0]}
              </AvatarFallback>
            </Avatar>
          </Link>

          {/* Continuous vertical line down from parent avatar into replies container */}
          {hasReplies && (
            <div className="absolute left-[15px] top-8 -bottom-3 w-[2px] bg-border/70 dark:bg-border/60 pointer-events-none" />
          )}
        </div>

        {/* Content Box */}
        <div className="flex-1 min-w-0">
          <div
            className={cn(
              "px-3.5 py-2 rounded-[18px] relative inline-block max-w-[calc(100%-8px)] transition-all",
              comm.is_hidden
                ? "bg-amber-500/10 border border-dashed border-amber-500/30"
                : "bg-muted/60 dark:bg-card/90 border border-border/40 shadow-2xs"
            )}
          >
            {/* Header info */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <Link
                href={`/profile/${comm.profiles?.username || ""}`}
                className="font-semibold text-xs sm:text-[13px] text-foreground hover:underline truncate leading-tight"
              >
                {authorName}
              </Link>

              {isPostAuthor && (
                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-primary/15 text-primary border border-primary/20">
                  Author
                </span>
              )}

              {comm.is_hidden && (
                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400">
                  Hidden
                </span>
              )}
            </div>

            {/* Editing mode or regular text */}
            {isEditing ? (
              <div className="mt-1.5 space-y-2">
                <textarea
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  className="w-full bg-background border border-border rounded-xl p-2 text-xs outline-none focus:border-primary resize-none"
                  rows={2}
                  maxLength={500}
                  autoFocus
                />
                <div className="flex items-center gap-1.5 justify-end">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => setEditingCommentId(null)}
                    className="h-6 px-2 text-[11px]"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    disabled={!editText.trim() || isSavingEdit}
                    onClick={() => handleSaveEdit(comm.id)}
                    className="h-6 px-2.5 text-[11px] gap-1"
                  >
                    {isSavingEdit ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                    Save
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-xs sm:text-[13px] text-foreground/90 mt-0.5 whitespace-pre-wrap leading-snug break-words">
                {comm.content}
              </p>
            )}
          </div>

          {/* Action links under comment (Facebook style: Time · Like · Reply · ❤️ count · Options) */}
          {!isEditing && (
            <div className="flex items-center gap-2 sm:gap-2.5 mt-1 px-1.5 text-[11px] font-semibold text-muted-foreground flex-wrap">
              {/* Relative Time */}
              <span className="font-normal text-muted-foreground/70">
                {comm.created_at
                  ? formatDistanceToNow(new Date(comm.created_at), { addSuffix: true })
                  : ""}
                {isEdited && <span className="ml-1 italic text-[10px] font-normal">(edited)</span>}
              </span>

              {/* Like Button */}
              <button
                type="button"
                onClick={() => handleToggleLike(comm)}
                className={cn(
                  "hover:underline transition-colors cursor-pointer font-bold",
                  comm.liked ? "text-rose-500 font-bold" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {comm.liked ? "Liked" : "Like"}
              </button>

              {/* Reply Button (Only allowed on top-level comments to maintain clean 2-tier tree) */}
              {!isReply && (
                <button
                  type="button"
                  onClick={() => {
                    setReplyingTo({
                      id: comm.id,
                      username: comm.profiles?.username || "user",
                    });
                  }}
                  className="hover:underline text-muted-foreground hover:text-foreground font-bold transition-colors cursor-pointer"
                >
                  Reply
                </button>
              )}

              {/* Facebook-style reactions count pill */}
              {(comm.like_count || 0) > 0 && (
                <button
                  type="button"
                  onClick={() =>
                    setReactionsComment({
                      id: comm.id,
                      count: comm.like_count || 0,
                    })
                  }
                  title="See who reacted to this comment"
                  className="flex items-center gap-1 font-semibold text-muted-foreground hover:text-foreground hover:underline cursor-pointer transition-colors"
                >
                  <span className="h-4 w-4 rounded-full bg-rose-500 flex items-center justify-center text-white shadow-2xs">
                    <Heart className="h-2.5 w-2.5 fill-white text-white" />
                  </span>
                  <span>{comm.like_count}</span>
                </button>
              )}

              {/* If top-level comment has replies, show reply count */}
              {hasReplies && repliesCount > 0 && (
                <span className="text-[11px] font-medium text-muted-foreground/70 hidden sm:inline">
                  · {repliesCount} {repliesCount === 1 ? "Reply" : "Replies"}
                </span>
              )}

              {/* Three-dots menu */}
              {(canDelete || canHide || isCommentAuthor) && (
                <DropdownMenu>
                  <DropdownMenuTrigger
                    className="opacity-0 group-hover/comm:opacity-100 hover:opacity-100 transition-opacity p-0.5 text-muted-foreground hover:text-foreground cursor-pointer rounded-full"
                    aria-label="Comment options"
                  >
                    <MoreHorizontal className="h-3 w-3" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-40 text-xs">
                    {/* Author can edit */}
                    {isCommentAuthor && (
                      <DropdownMenuItem
                        onClick={() => {
                          setEditingCommentId(comm.id);
                          setEditText(comm.content);
                        }}
                        className="gap-2 cursor-pointer"
                      >
                        <Edit2 className="h-3.5 w-3.5 text-muted-foreground" />
                        Edit comment
                      </DropdownMenuItem>
                    )}

                    {/* Post owner or admin can hide */}
                    {canHide && (
                      <DropdownMenuItem
                        onClick={() => handleToggleHide(comm)}
                        className="gap-2 cursor-pointer"
                      >
                        {comm.is_hidden ? (
                          <>
                            <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                            Unhide comment
                          </>
                        ) : (
                          <>
                            <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />
                            Hide from post
                          </>
                        )}
                      </DropdownMenuItem>
                    )}

                    {canDelete && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => handleDeleteComment(comm.id)}
                          className="gap-2 text-destructive focus:text-destructive cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Delete comment
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  // Paginate top-level comments: show last 3 by default if more than 3
  const displayedComments =
    topLevelComments.length > 3 && !isExpanded
      ? topLevelComments.slice(-3)
      : topLevelComments;

  const hiddenCount = topLevelComments.length - displayedComments.length;

  return (
    <div className="w-full pt-2 border-t border-border/40 space-y-3 animate-in fade-in slide-in-from-top-1">
      {/* Top Header with Hide Comments toggle */}
      <div className="flex items-center justify-between text-xs px-0.5 pb-0.5">
        <span className="font-semibold text-foreground/80 text-[11px]">
          Comments ({comments.length})
        </span>

        {onHideComments && (
          <button
            type="button"
            onClick={onHideComments}
            className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground hover:underline transition-colors cursor-pointer"
          >
            <ChevronUp className="h-3.5 w-3.5" />
            <span>Hide comments</span>
          </button>
        )}
      </div>

      {/* View previous comments toggle if many comments */}
      {hiddenCount > 0 && (
        <button
          type="button"
          onClick={() => setIsExpanded(true)}
          className="text-[11px] font-semibold text-primary hover:underline transition-colors cursor-pointer block"
        >
          View previous comments ({hiddenCount})
        </button>
      )}

      {/* Comments List */}
      {isLoading ? (
        <div className="flex justify-center py-4">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      ) : topLevelComments.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-3">
          No comments yet. Be the first to comment!
        </p>
      ) : (
        <div className="space-y-4 max-h-96 overflow-y-auto pr-1">
          {displayedComments.map((parent) => {
            const replies = repliesByParentId.get(parent.id) || [];
            const hasReplies = replies.length > 0;

            return (
              <div key={parent.id} className="relative space-y-2">
                {/* Top-Level Parent Comment */}
                {renderCommentRow(parent, false, hasReplies, replies.length)}

                {/* Facebook-style Threaded Replies with Continuous Curved Branch Line */}
                {hasReplies && (
                  <div className="space-y-2.5 mt-2">
                    {replies.map((reply, idx) => {
                      const isLastReply = idx === replies.length - 1;

                      return (
                        <div key={reply.id} className="relative pl-8 sm:pl-9">
                          {/* Stem line continuing downward if not last reply */}
                          {!isLastReply && (
                            <div className="absolute left-[15px] top-0 bottom-0 w-[2px] bg-border/70 dark:bg-border/60 pointer-events-none" />
                          )}

                          {/* Curved Branch Elbow (connects seamlessly to reply avatar) */}
                          <div className="absolute left-[15px] top-0 w-4 sm:w-5 h-[16px] border-b-2 border-l-2 border-border/70 dark:border-border/60 rounded-bl-xl pointer-events-none" />

                          {/* Render Reply Row */}
                          {renderCommentRow(reply, true, false, 0)}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Show less toggle when expanded */}
      {isExpanded && topLevelComments.length > 3 && (
        <button
          type="button"
          onClick={() => setIsExpanded(false)}
          className="text-[11px] font-semibold text-muted-foreground hover:text-primary hover:underline transition-colors cursor-pointer block pt-0.5"
        >
          Show less
        </button>
      )}

      {/* Replying Banner */}
      {replyingTo && (
        <div className="flex items-center justify-between px-3 py-1 bg-primary/10 border border-primary/20 rounded-xl text-xs text-primary font-medium animate-in fade-in duration-100">
          <div className="flex items-center gap-1.5">
            <CornerDownRight className="h-3 w-3" />
            <span>Replying to @{replyingTo.username}</span>
          </div>
          <button
            type="button"
            onClick={() => setReplyingTo(null)}
            className="p-0.5 rounded-full hover:bg-primary/20 text-primary transition-colors cursor-pointer"
            title="Cancel reply"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Add Comment / Reply Input Form */}
      <form onSubmit={handleSubmit} className="flex gap-2 items-center pt-1">
        <input
          type="text"
          placeholder={replyingTo ? `Reply to @${replyingTo.username}...` : "Write a comment..."}
          value={commentText}
          onChange={(e) => setCommentText(e.target.value)}
          className="flex-1 bg-muted/40 border border-border/60 rounded-full px-3.5 py-1.5 text-xs outline-none focus:border-primary transition-colors placeholder:text-muted-foreground"
          maxLength={500}
        />
        <Button
          type="submit"
          size="sm"
          disabled={!commentText.trim() || isSubmitting}
          className="rounded-full h-7 px-3 text-xs gap-1 shadow-2xs font-semibold cursor-pointer"
        >
          {isSubmitting ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Send className="h-3 w-3" />
          )}
          {replyingTo ? "Reply" : "Post"}
        </Button>
      </form>

      {/* Comment Reactions Modal */}
      {reactionsComment && (
        <ReactionsModal
          isOpen={Boolean(reactionsComment)}
          onClose={() => setReactionsComment(null)}
          title="People who reacted to this comment"
          fetchUrl={`/api/posts/${postId}/comments/${reactionsComment.id}/like`}
          totalCount={reactionsComment.count}
        />
      )}
    </div>
  );
}

