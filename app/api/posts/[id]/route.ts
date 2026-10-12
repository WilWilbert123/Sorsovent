import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

function getServiceRoleSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createAdminClient(url, key);
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const adminSupabase = getServiceRoleSupabase();

    // Check post ownership
    const { data: post, error: fetchError } = await adminSupabase
      .from("posts")
      .select("id, author_id")
      .eq("id", id)
      .single();

    if (fetchError || !post) {
      return NextResponse.json({ success: false, error: "Post not found" }, { status: 404 });
    }

    // Check if user is author or admin/super_admin
    const isAuthor = post.author_id === user.id;

    if (!isAuthor) {
      const { data: userRole } = await adminSupabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .maybeSingle();

      const isAdmin = userRole?.role === "ADMIN" || userRole?.role === "SUPER_ADMIN";
      if (!isAdmin) {
        return NextResponse.json(
          { success: false, error: "You don't have permission to delete this post" },
          { status: 403 }
        );
      }
    }

    // Delete post (foreign keys ON DELETE CASCADE will clean likes, comments, post_media)
    const { error: deleteError } = await adminSupabase
      .from("posts")
      .delete()
      .eq("id", id);

    if (deleteError) {
      console.error("Error deleting post:", deleteError);
      return NextResponse.json({ success: false, error: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "Post deleted successfully" });
  } catch (error: any) {
    console.error("Delete post error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
