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

    // Fetch post author to notify
    const { data: postRecord } = await adminSupabase
      .from("posts")
      .select("id, author_id")
      .eq("id", postId)
      .maybeSingle();

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
      if (postRecord?.author_id) {
        await createInAppNotification({
          userId: postRecord.author_id,
          actorId: user.id,
          type: "like",
          postId,
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
