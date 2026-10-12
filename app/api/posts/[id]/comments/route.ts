import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createInAppNotification } from "@/lib/notifications/service";
import { z } from "zod";

function getServiceRoleSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createAdminClient(url, key);
}

const commentSchema = z.object({
  content: z.string().min(1, "Comment cannot be empty").max(500, "Comment cannot exceed 500 characters"),
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: postId } = await params;
    const adminSupabase = getServiceRoleSupabase();

    const { data: comments, error } = await adminSupabase
      .from("comments")
      .select(`
        id,
        post_id,
        author_id,
        content,
        created_at,
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

    return NextResponse.json({ success: true, data: comments || [] });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
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
      return NextResponse.json({ success: false, error: "Please sign in to comment" }, { status: 401 });
    }

    const body = await request.json();
    const validation = commentSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.issues[0]?.message || "Invalid comment" },
        { status: 400 }
      );
    }

    const adminSupabase = getServiceRoleSupabase();

    const { data: newComment, error } = await adminSupabase
      .from("comments")
      .insert({
        post_id: postId,
        author_id: user.id,
        content: validation.data.content.trim(),
      })
      .select(`
        id,
        post_id,
        author_id,
        content,
        created_at,
        profiles!comments_author_id_fkey (
          id,
          username,
          display_name,
          avatar_url
        )
      `)
      .single();

    if (error) throw error;

    // Notify post author
    try {
      const { data: postRecord } = await adminSupabase
        .from("posts")
        .select("id, author_id")
        .eq("id", postId)
        .maybeSingle();

      if (postRecord?.author_id) {
        await createInAppNotification({
          userId: postRecord.author_id,
          actorId: user.id,
          type: "comment",
          postId,
          customText: validation.data.content.trim(),
        });
      }
    } catch (notifErr) {
      console.warn("Failed to notify author on comment:", notifErr);
    }

    return NextResponse.json({ success: true, data: newComment }, { status: 201 });
  } catch (error: any) {
    console.error("Add comment error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
