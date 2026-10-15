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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: postId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ success: false, error: "Please sign in to like posts" }, { status: 401 });
    }

    const adminSupabase = getServiceRoleSupabase();

    // Check if user already liked the post
    const { data: existingLike } = await adminSupabase
      .from("likes")
      .select("id")
      .eq("post_id", postId)
      .eq("user_id", user.id)
      .maybeSingle();

    // Fetch post author to notify (checking if post has photos)
    const { data: postRecord } = await adminSupabase
      .from("posts")
      .select("id, author_id, media_urls, post_media(id)")
      .eq("id", postId)
      .maybeSingle();

    const hasPhoto =
      (postRecord?.media_urls && postRecord.media_urls.length > 0) ||
      (postRecord?.post_media && postRecord.post_media.length > 0);

    let liked = false;

    if (existingLike) {
      // Unlike
      await adminSupabase
        .from("likes")
        .delete()
        .eq("post_id", postId)
        .eq("user_id", user.id);
      liked = false;

      // Remove like notification for post author
      if (postRecord?.author_id) {
        await removeInAppNotification({
          userId: postRecord.author_id,
          actorId: user.id,
          type: "like",
          postId,
        });
      }
    } else {
      // Like
      await adminSupabase.from("likes").insert({
        post_id: postId,
        user_id: user.id,
      });
      liked = true;

      // Create like notification for post author
      if (postRecord?.author_id && postRecord.author_id !== user.id) {
        await createInAppNotification({
          userId: postRecord.author_id,
          actorId: user.id,
          type: "like",
          postId,
          customTitle: hasPhoto ? "Photo Reaction ❤️" : "Post Reaction ❤️",
          customText: `liked your ${hasPhoto ? "photo" : "post"}.`,
        });
      }
    }

    // Get updated like count
    const { count } = await adminSupabase
      .from("likes")
      .select("id", { count: "exact", head: true })
      .eq("post_id", postId);

    return NextResponse.json({
      success: true,
      liked,
      like_count: count || 0,
    });
  } catch (error: any) {
    console.error("Like toggle error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: postId } = await params;
    const adminSupabase = getServiceRoleSupabase();

    const { data: likes, error } = await adminSupabase
      .from("likes")
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
      .eq("post_id", postId)
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
    console.error("Fetch post likes error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch post reactions" },
      { status: 500 }
    );
  }
}

