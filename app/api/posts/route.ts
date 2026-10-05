import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const postSchema = z.object({
  content: z.string().min(1).max(500),
  location_name: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validation = postSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const { data: post, error } = await supabase
      .from("posts")
      .insert({
        ...validation.data,
        author_id: user.id,
      })
      .select("id")
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true, data: post }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "20");
    
    const supabase = await createClient();
    
    const { data: posts, error } = await supabase
      .from("posts")
      .select(`
        id, content, created_at, location_name, like_count, comment_count,
        profiles!posts_author_id_fkey (username, full_name, avatar_url),
        post_media (media_url, media_type)
      `)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw error;

    return NextResponse.json({ success: true, data: posts }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
