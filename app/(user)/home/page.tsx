import { createClient } from "@/lib/supabase/server";
import { FeedPost } from "@/components/feed/feed-post";
import { CreatePostCard } from "@/components/feed/create-post-card";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";

async function Feed() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  // Get posts from followed users + own posts
  const { data: posts } = await supabase
    .from("posts")
    .select(`
      id,
      content,
      media_urls,
      location_name,
      location_lat,
      location_lng,
      created_at,
      like_count,
      comment_count,
      profiles!posts_author_id_fkey (
        id,
        username,
        full_name,
        avatar_url
      )
    `)
    .order("created_at", { ascending: false })
    .limit(20);

  if (!posts || posts.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <p className="text-lg font-medium">No posts yet</p>
        <p className="text-sm mt-1">Follow people or create the first post!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {posts.map((post) => (
        <FeedPost key={post.id} post={post as any} currentUserId={user.id} />
      ))}
    </div>
  );
}

export default async function HomePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("username, full_name, avatar_url")
    .eq("id", user!.id)
    .single();

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <CreatePostCard profile={profile} userId={user!.id} />

      <div className="mt-6">
        <Suspense
          fallback={
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="rounded-xl border bg-card p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="space-y-1.5">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                  </div>
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              ))}
            </div>
          }
        >
          <Feed />
        </Suspense>
      </div>
    </div>
  );
}
