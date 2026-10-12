import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { RealtimeHomeFeed } from "@/components/feed/realtime-home-feed";
import { CommunitySidebar } from "@/components/feed/community-sidebar";
import { FeedPostData } from "@/components/feed/feed-post";
import { redirect } from "next/navigation";

function getServiceRoleSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createAdminClient(url, key);
}

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const adminSupabase = getServiceRoleSupabase();

  // Fetch current user's profile
  const { data: profile } = await adminSupabase
    .from("profiles")
    .select("id, username, display_name, avatar_url")
    .eq("id", user.id)
    .maybeSingle();

  // Fetch current user's role
  const { data: roleRecord } = await adminSupabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();

  const userRole = roleRecord?.role || "USER";

  // Fetch initial posts with all relationships accurately
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
        content,
        created_at,
        profiles!comments_author_id_fkey (
          id,
          username,
          display_name,
          avatar_url
        )
      ),
      post_media (
        media_url,
        media_type,
        display_order
      )
    `)
    .order("created_at", { ascending: false })
    .limit(30);

  if (error) {
    console.error("Home feed initial query error:", error);
  }

  // Get author roles for badges
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

  const initialPosts: FeedPostData[] = (rawPosts || []).map((post: any) => {
    const likesList = post.likes || [];
    const commentsList = post.comments || [];
    const mediaList = post.post_media || [];

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
      liked: likesList.some((l: any) => l.user_id === user.id),
      comments: commentsList,
      comment_count: commentsList.length,
      post_media: mediaList,
      media_urls: mediaList.map((m: any) => m.media_url),
    };
  });

  // Fetch upcoming events for sidebar (excluding completed ones)
  const { data: rawUpcomingEvents } = await adminSupabase
    .from("events")
    .select("id, title, location_name, start_time, category")
    .or("status.is.null,status.neq.completed")
    .order("created_at", { ascending: false })
    .limit(3);

  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Main Feed Column */}
        <div className="lg:col-span-8 w-full max-w-2xl mx-auto space-y-5">
          <RealtimeHomeFeed
            initialPosts={initialPosts}
            currentUserId={user.id}
            currentUserProfile={profile}
            currentUserRole={userRole}
          />
        </div>

        {/* Right Community Discovery Column (Desktop) */}
        <div className="hidden lg:block lg:col-span-4 sticky top-6">
          <CommunitySidebar upcomingEvents={rawUpcomingEvents || []} />
        </div>
      </div>
    </div>
  );
}
