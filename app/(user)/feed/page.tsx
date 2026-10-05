import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { PostList } from "@/components/posts/post-list";

export default async function UserFeedPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  // In a real application, fetch posts from followed users + local area
  const { data: posts } = await supabase
    .from("posts")
    .select(`
      id, content, created_at, location_name, like_count, comment_count,
      profiles!posts_author_id_fkey (username, full_name, avatar_url),
      post_media (media_url, media_type)
    `)
    .order("created_at", { ascending: false })
    .limit(20);

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Your Feed</h1>
        <p className="text-muted-foreground mt-2">
          Updates from your network and top events in Sorsogon.
        </p>
      </div>

      <PostList posts={posts || []} />
    </div>
  );
}
