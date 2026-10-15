import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { z } from "zod";

function getServiceRoleSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createAdminClient(url, key);
}

const postSchema = z.object({
  content: z.string().min(1, "Post content cannot be empty").max(1000, "Post cannot exceed 1000 characters"),
  location_name: z.string().optional().nullable(),
  media_urls: z.array(z.string().url()).optional().default([]),
});

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ success: false, error: "Please log in to post" }, { status: 401 });
    }

    const body = await request.json();
    const validation = postSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.issues[0]?.message || "Invalid post data" },
        { status: 400 }
      );
    }

    const { content, location_name, media_urls } = validation.data;
    const adminSupabase = getServiceRoleSupabase();

    // Verify user is not suspended
    const { data: authorProfile } = await adminSupabase
      .from("profiles")
      .select("privacy_settings")
      .eq("id", user.id)
      .single();

    if (authorProfile?.privacy_settings?.is_banned) {
      return NextResponse.json(
        { success: false, error: "Your account is currently suspended from publishing content." },
        { status: 403 }
      );
    }

    // Insert post into posts table
    const { data: post, error: insertError } = await adminSupabase
      .from("posts")
      .insert({
        author_id: user.id,
        content: content.trim(),
        location_name: location_name ? location_name.trim() : null,
        visibility: "public",
      })
      .select("id, author_id, content, location_name, created_at, updated_at")
      .single();

    if (insertError) {
      console.error("Error creating post:", insertError);
      return NextResponse.json({ success: false, error: insertError.message }, { status: 500 });
    }

    // Insert media records if provided
    if (media_urls && media_urls.length > 0) {
      const mediaRecords = media_urls.map((url, index) => ({
        post_id: post.id,
        media_url: url,
        media_type: "image",
        display_order: index,
      }));

      await adminSupabase.from("post_media").insert(mediaRecords);
    }

    // Fetch author profile
    const { data: profile } = await adminSupabase
      .from("profiles")
      .select("id, username, display_name, avatar_url")
      .eq("id", user.id)
      .single();

    // Check user role
    const { data: userRole } = await adminSupabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();

    const formattedPost = {
      id: post.id,
      author_id: post.author_id,
      content: post.content,
      location_name: post.location_name,
      created_at: post.created_at,
      updated_at: post.updated_at,
      profiles: profile || {
        id: user.id,
        username: user.email?.split("@")[0] || "user",
        display_name: user.user_metadata?.full_name || "User",
        avatar_url: null,
      },
      author_role: userRole?.role || "USER",
      likes: [],
      like_count: 0,
      liked: false,
      comments: [],
      comment_count: 0,
      post_media: (media_urls || []).map((url) => ({ media_url: url })),
      media_urls: media_urls || [],
    };

    return NextResponse.json({ success: true, data: formattedPost }, { status: 201 });
  } catch (error: any) {
    console.error("Posts POST API error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "30");

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const adminSupabase = getServiceRoleSupabase();

    const { data: rawPosts, error } = await adminSupabase
      .from("posts")
      .select(`
        id,
        author_id,
        content,
        location_name,
        created_at,
        updated_at,
        profiles!posts_author_id_fkey (
          id,
          username,
          display_name,
          avatar_url
        ),
        likes (
          user_id
        ),
        comments (
          id,
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
          ),
          comment_likes (
            user_id
          )
        ),
        post_media (
          media_url,
          media_type,
          display_order
        )
      `)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("Posts GET API error:", error);
      throw error;
    }

    // Get author roles for badge display
    const authorIds = Array.from(new Set((rawPosts || []).map((p: any) => p.author_id)));
    let rolesMap: Record<string, string> = {};
    if (authorIds.length > 0) {
      const { data: roles } = await adminSupabase
        .from("user_roles")
        .select("user_id, role")
        .in("user_id", authorIds);
      if (roles) {
        roles.forEach((r: any) => {
          rolesMap[r.user_id] = r.role;
        });
      }
    }

    const posts = (rawPosts || []).map((post: any) => {
      const likesList = post.likes || [];
      const rawComments = post.comments || [];
      const mediaList = post.post_media || [];

      const commentsList = rawComments.map((comm: any) => {
        const cLikes = comm.comment_likes || [];
        return {
          id: comm.id,
          post_id: post.id,
          author_id: comm.author_id,
          parent_id: comm.parent_id || null,
          content: comm.content,
          is_hidden: Boolean(comm.is_hidden),
          created_at: comm.created_at,
          updated_at: comm.updated_at,
          profiles: comm.profiles,
          like_count: cLikes.length,
          liked: user ? cLikes.some((l: any) => l.user_id === user.id) : false,
        };
      });

      return {
        id: post.id,
        author_id: post.author_id,
        content: post.content,
        location_name: post.location_name,
        created_at: post.created_at,
        updated_at: post.updated_at,
        profiles: post.profiles,
        author_role: rolesMap[post.author_id] || "USER",
        likes: likesList,
        like_count: likesList.length,
        liked: user ? likesList.some((l: any) => l.user_id === user.id) : false,
        comments: commentsList,
        comment_count: commentsList.length,
        post_media: mediaList,
        media_urls: mediaList.map((m: any) => m.media_url),
      };
    });

    return NextResponse.json({ success: true, data: posts }, { status: 200 });
  } catch (error: any) {
    console.error("Posts GET API catch error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
