import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createInAppNotification } from "@/lib/notifications/service";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { z } from "zod";

function getServiceRoleSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createAdminClient(url, key);
}

const commentSchema = z.object({
  content: z
    .string()
    .min(1, "Comment cannot be empty")
    .max(500, "Comment cannot exceed 500 characters"),
  parent_id: z.string().uuid().optional().nullable(),
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: postId } = await params;
    const adminSupabase = getServiceRoleSupabase();

    // Check optional authenticated user for "liked" status
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Query comments including parent_id and is_hidden
    const { data: comments, error } = await adminSupabase
      .from("comments")
      .select(`
        id,
        post_id,
        author_id,
        parent_id,
        content,
        is_hidden,
        created_at,
        updated_at,
        profiles!comments_author_id_fkey (
          id,
          username,
          display_name,
          avatar_url
        )
      `)
      .eq("post_id", postId)
      .order("created_at", { ascending: true });

    if (error) throw error;

    const commentIds = (comments || []).map((c) => c.id);

    // Fetch comment likes
    const likesMap = new Map<string, { count: number; liked: boolean }>();
    if (commentIds.length > 0) {
      try {
        const { data: likes } = await adminSupabase
          .from("comment_likes")
          .select("comment_id, user_id")
          .in("comment_id", commentIds);

        if (likes) {
          for (const l of likes) {
            const current = likesMap.get(l.comment_id) || {
              count: 0,
              liked: false,
            };
            current.count += 1;
            if (user && l.user_id === user.id) {
              current.liked = true;
            }
            likesMap.set(l.comment_id, current);
          }
        }
      } catch {
        // Fallback if comment_likes table is pending migration
      }
    }

    const enhancedComments = (comments || []).map((comm) => {
      const likeInfo = likesMap.get(comm.id) || { count: 0, liked: false };
      return {
        ...comm,
        parent_id: comm.parent_id || null,
        is_hidden: Boolean(comm.is_hidden),
        like_count: likeInfo.count,
        liked: likeInfo.liked,
      };
    });

    return NextResponse.json({ success: true, data: enhancedComments });
  } catch (error: unknown) {
    console.error("Comments GET error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: postId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Please sign in to comment" },
        { status: 401 }
      );
    }

    const rate = checkRateLimit(`comment_create:${user.id}`, 20, 60_000);
    if (!rate.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: `You are commenting too quickly. Please wait ${rate.retryAfterSeconds}s.`,
        },
        { status: 429 }
      );
    }

    const body = await request.json();
    const validation = commentSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: validation.error.issues[0]?.message || "Invalid comment",
        },
        { status: 400 }
      );
    }

    const adminSupabase = getServiceRoleSupabase();

    // Verify user is not suspended
    const { data: commenterProfile } = await adminSupabase
      .from("profiles")
      .select("privacy_settings")
      .eq("id", user.id)
      .maybeSingle();

    if (commenterProfile?.privacy_settings?.is_banned) {
      return NextResponse.json(
        {
          success: false,
          error: "Your account is currently suspended from commenting.",
        },
        { status: 403 }
      );
    }

    const parentId = validation.data.parent_id || null;

    const { data: newComment, error } = await adminSupabase
      .from("comments")
      .insert({
        post_id: postId,
        author_id: user.id,
        parent_id: parentId,
        content: validation.data.content.trim(),
      })
      .select(`
        id,
        post_id,
        author_id,
        parent_id,
        content,
        is_hidden,
        created_at,
        updated_at,
        profiles!comments_author_id_fkey (
          id,
          username,
          display_name,
          avatar_url
        )
      `)
      .single();

    if (error) throw error;

    // Notifications & Realtime Push
    try {
      const profileData: any = Array.isArray(newComment.profiles)
        ? newComment.profiles[0]
        : newComment.profiles;
      const commenterName =
        profileData?.display_name || profileData?.username || "Someone";

      const commentSnippet = validation.data.content.trim().slice(0, 70);

      // Check if the post has photo/media
      const { data: postRecord } = await adminSupabase
        .from("posts")
        .select("id, author_id, post_media(id)")
        .eq("id", postId)
        .maybeSingle();

      const hasPhoto = Boolean(
        postRecord?.post_media && postRecord.post_media.length > 0
      );
      const postTypeLabel = hasPhoto ? "photo" : "post";

      let parentAuthorId: string | null = null;

      // 1. If this is a reply to another comment, send a push notification to that comment's owner
      if (parentId) {
        const { data: parentComment } = await adminSupabase
          .from("comments")
          .select("id, author_id, content")
          .eq("id", parentId)
          .maybeSingle();

        if (
          parentComment?.author_id &&
          typeof parentComment.author_id === "string"
        ) {
          parentAuthorId = parentComment.author_id;
          if (parentAuthorId !== user.id) {
            await createInAppNotification({
              userId: parentAuthorId,
              actorId: user.id,
              type: "reply",
              postId,
              commentId: newComment.id,
              customTitle: "New Reply to your Comment 💬",
              customText: `${commenterName} replied: "${commentSnippet}"`,
            });
          }
        }
      }

      // 2. Notify the post/photo owner (if they are not the commenter and not already notified as parent author)
      if (
        postRecord?.author_id &&
        postRecord.author_id !== user.id &&
        postRecord.author_id !== parentAuthorId
      ) {
        await createInAppNotification({
          userId: postRecord.author_id,
          actorId: user.id,
          type: "comment",
          postId,
          commentId: newComment.id,
          customTitle: hasPhoto
            ? "New Comment on your Photo 📸"
            : "New Comment on your Post 💬",
          customText: `${commenterName} commented on your ${postTypeLabel}: "${commentSnippet}"`,
        });
      }
    } catch (notifErr) {
      console.warn("Failed to notify author on comment:", notifErr);
    }

    const returnData = {
      ...newComment,
      parent_id: parentId,
      is_hidden: false,
      like_count: 0,
      liked: false,
    };

    return NextResponse.json(
      { success: true, data: returnData },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error("Add comment error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
