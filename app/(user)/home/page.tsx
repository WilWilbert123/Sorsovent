import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { RealtimeHomeFeed } from "@/components/feed/realtime-home-feed";
import { CommunitySidebar } from "@/components/feed/community-sidebar";
import { FeedPostData } from "@/components/feed/feed-post";
import { CommentData } from "@/components/feed/post-comments";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

const INITIAL_FEED_PAGE_SIZE = 10;

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

  // Fetch current user's profile, role, initial 10 feed posts (+1 for hasMore), and sidebar events concurrently in PARALLEL
  const [profileRes, roleRecordRes, postsRes, upcomingEventsRes] = await Promise.all([
    adminSupabase
      .from("profiles")
      .select("id, username, full_name, display_name, avatar_url")
      .eq("id", user.id)
      .maybeSingle(),
    adminSupabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle(),
    adminSupabase
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
          full_name,
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
            full_name,
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
      .limit(INITIAL_FEED_PAGE_SIZE + 1),
    adminSupabase
      .from("events")
      .select("id, title, location_name, start_time, category")
      .or("status.is.null,status.neq.completed")
      .order("created_at", { ascending: false })
      .limit(4),
  ]);

  const profile = profileRes.data;
  const userRole = roleRecordRes.data?.role || "USER";
  const allFetchedPosts = postsRes.data || [];
  const initialHasMore = allFetchedPosts.length > INITIAL_FEED_PAGE_SIZE;
  const rawPosts = allFetchedPosts.slice(0, INITIAL_FEED_PAGE_SIZE);
  const rawUpcomingEvents = upcomingEventsRes.data;

  if (postsRes.error) {
    console.error("Home feed initial query error:", postsRes.error);
  }

  // Get author roles for badges
  const authorIds = Array.from(new Set(rawPosts.map((p: any) => p.author_id)));
  const rolesMap: Record<string, string> = {};
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

  const initialPosts: FeedPostData[] = rawPosts.map((post: any) => {
    const likesList = post.likes || [];
    const rawComments = post.comments || [];
    const mediaList = post.post_media || [];

    const commentsList: CommentData[] = rawComments.map((comm: any) => {
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
        liked: cLikes.some((l: any) => l.user_id === user.id),
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
      liked: likesList.some((l: any) => l.user_id === user.id),
      comments: commentsList,
      comment_count: commentsList.length,
      post_media: mediaList,
      media_urls: mediaList.map((m: any) => m.media_url),
    };
  });

  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-4 lg:px-6 pt-2.5 sm:pt-5 pb-20 sm:pb-8">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Main Feed Column */}
        <div className="lg:col-span-8 w-full max-w-2xl mx-auto">
          <RealtimeHomeFeed
            initialPosts={initialPosts}
            initialHasMore={initialHasMore}
            currentUserId={user.id}
            currentUserProfile={profile}
            currentUserRole={userRole}
            upcomingEvents={rawUpcomingEvents || []}
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
