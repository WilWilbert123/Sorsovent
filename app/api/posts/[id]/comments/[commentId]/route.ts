import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { z } from "zod";

function getServiceRoleSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createAdminClient(url, key);
}

const updateCommentSchema = z.object({
  content: z.string().min(1).max(500).optional(),
  is_hidden: z.boolean().optional(),
});

export async function PATCH(
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
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validation = updateCommentSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.issues[0]?.message || "Invalid input" },
        { status: 400 }
      );
    }

    const adminSupabase = getServiceRoleSupabase();

    // Fetch existing comment and parent post
    const [{ data: comment }, { data: post }, { data: userRoleRow }] = await Promise.all([
      adminSupabase.from("comments").select("id, author_id, content, is_hidden").eq("id", commentId).maybeSingle(),
      adminSupabase.from("posts").select("id, author_id").eq("id", postId).maybeSingle(),
      adminSupabase.from("user_roles").select("role").eq("user_id", user.id).maybeSingle(),
    ]);

    if (!comment) {
      return NextResponse.json({ success: false, error: "Comment not found" }, { status: 404 });
    }

    const isCommentAuthor = comment.author_id === user.id;
    const isPostOwner = post?.author_id === user.id;
    const isAdmin = userRoleRow?.role === "ADMIN" || userRoleRow?.role === "SUPER_ADMIN";

    const updatePayload: Record<string, any> = {};

    // 1. Updating comment content: only the comment author can edit
    if (validation.data.content !== undefined) {
      if (!isCommentAuthor) {
        return NextResponse.json(
          { success: false, error: "You can only edit your own comment" },
          { status: 403 }
        );
      }
      updatePayload.content = validation.data.content.trim();
      updatePayload.updated_at = new Date().toISOString();
    }

    // 2. Hiding/Unhiding comment: post owner or admin can hide comments
    if (validation.data.is_hidden !== undefined) {
      if (!isPostOwner && !isAdmin) {
        return NextResponse.json(
          { success: false, error: "Only the post owner or an admin can hide comments" },
          { status: 403 }
        );
      }
      updatePayload.is_hidden = validation.data.is_hidden;
    }

    const { data: updated, error } = await adminSupabase
      .from("comments")
      .update(updatePayload)
      .eq("id", commentId)
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

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    console.error("Update comment error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update comment" },
      { status: 500 }
    );
  }
}

export async function DELETE(
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
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const adminSupabase = getServiceRoleSupabase();

    // Fetch comment and post to check permissions
    const [{ data: comment }, { data: post }, { data: userRoleRow }] = await Promise.all([
      adminSupabase.from("comments").select("id, author_id").eq("id", commentId).maybeSingle(),
      adminSupabase.from("posts").select("id, author_id").eq("id", postId).maybeSingle(),
      adminSupabase.from("user_roles").select("role").eq("user_id", user.id).maybeSingle(),
    ]);

    if (!comment) {
      return NextResponse.json({ success: false, error: "Comment not found" }, { status: 404 });
    }

    const isCommentAuthor = comment.author_id === user.id;
    const isPostOwner = post?.author_id === user.id;
    const isAdmin = userRoleRow?.role === "ADMIN" || userRoleRow?.role === "SUPER_ADMIN";

    // Permission check: Comment author, post owner, or admin can delete
    if (!isCommentAuthor && !isPostOwner && !isAdmin) {
      return NextResponse.json(
        { success: false, error: "You do not have permission to delete this comment" },
        { status: 403 }
      );
    }

    const { error } = await adminSupabase.from("comments").delete().eq("id", commentId);

    if (error) throw error;

    return NextResponse.json({ success: true, message: "Comment deleted" });
  } catch (error: any) {
    console.error("Delete comment error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to delete comment" },
      { status: 500 }
    );
  }
}
