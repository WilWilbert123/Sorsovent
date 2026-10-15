import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createInAppNotification, removeInAppNotification } from "@/lib/notifications/service";

function getServiceRoleSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createAdminClient(url, key);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; commentId: string }> }
) {
  try {
    const { id: postId, commentId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ success: false, error: "Please sign in to like comments" }, { status: 401 });
    }

    const adminSupabase = getServiceRoleSupabase();

    // Check if user already liked the comment
    const { data: existingLike } = await adminSupabase
      .from("comment_likes")
      .select("id")
      .eq("comment_id", commentId)
      .eq("user_id", user.id)
      .maybeSingle();

    let liked = false;

    if (existingLike) {
      // Unlike
      await adminSupabase.from("comment_likes").delete().eq("id", existingLike.id);
      liked = false;

      // Remove notification on unlike
      try {
        const { data: comment } = await adminSupabase
          .from("comments")
          .select("author_id")
          .eq("id", commentId)
          .maybeSingle();

        if (comment?.author_id) {
          await removeInAppNotification({
            userId: comment.author_id,
            actorId: user.id,
            type: "comment_like",
            postId,
            commentId,
          });
        }
      } catch (err) {
        console.warn("Error removing comment like notification:", err);
      }
    } else {
      // Like
      await adminSupabase.from("comment_likes").insert({
        comment_id: commentId,
        user_id: user.id,
      });
      liked = true;

      // Notify comment author with real-time push
      try {
        const { data: comment } = await adminSupabase
          .from("comments")
          .select("id, author_id, content, parent_id")
          .eq("id", commentId)
          .maybeSingle();

        if (comment?.author_id && comment.author_id !== user.id) {
          const isReply = Boolean(comment.parent_id);
          const label = isReply ? "reply" : "comment";
          const snippet = comment.content.slice(0, 45);

          await createInAppNotification({
            userId: comment.author_id,
            actorId: user.id,
            type: "comment_like",
            postId,
            commentId: comment.id,
            customTitle: isReply ? "Reply Liked ❤️" : "Comment Liked ❤️",
            customText: `liked your ${label}: "${snippet}"`,
          });
        }
      } catch (notifErr) {
        console.warn("Failed to notify on comment like:", notifErr);
      }
    }

    // Get updated total like count for this comment
    const { count } = await adminSupabase
      .from("comment_likes")
      .select("id", { count: "exact", head: true })
      .eq("comment_id", commentId);

    return NextResponse.json({
      success: true,
      data: {
        liked,
        like_count: count || 0,
      },
    });
  } catch (error: any) {
    console.error("Toggle comment like error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to toggle like" },
      { status: 500 }
    );
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; commentId: string }> }
) {
  try {
    const { commentId } = await params;
    const adminSupabase = getServiceRoleSupabase();

    const { data: likes, error } = await adminSupabase
      .from("comment_likes")
      .select(`
        id,
        created_at,
        profiles (
          id,
          username,
          display_name,
          full_name,
          avatar_url
        )
      `)
      .eq("comment_id", commentId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    const formatted = (likes || []).map((item: any) => {
      const p = Array.isArray(item.profiles) ? item.profiles[0] : item.profiles;
      return {
        id: item.id,
        created_at: item.created_at,
        user: p || null,
      };
    });

    return NextResponse.json({
      success: true,
      data: formatted,
    });
  } catch (error: any) {
    console.error("Fetch comment likes error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch comment reactions" },
      { status: 500 }
    );
  }
}

