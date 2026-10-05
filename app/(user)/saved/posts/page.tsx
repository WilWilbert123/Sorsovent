import { createClient } from "@/lib/supabase/server";
import { MessageSquare } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { formatRelativeTime } from "@/lib/utils/format";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default async function SavedPostsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: savedItems } = await supabase
    .from("saved_items")
    .select(`
      id,
      posts (
        id,
        content,
        created_at,
        profiles!posts_author_id_fkey (
          username,
          full_name,
          avatar_url
        )
      )
    `)
    .eq("user_id", user.id)
    .eq("item_type", "POST")
    .order("created_at", { ascending: false });

  const hasPosts = savedItems && savedItems.length > 0 && savedItems.some(i => i.posts);

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <div className="mb-6">
        <Link href="/saved" className="text-sm text-muted-foreground hover:text-foreground transition-colors mb-2 inline-block">
          ← Back to Saved
        </Link>
        <h1 className="text-2xl font-bold">Saved Posts</h1>
      </div>
      
      {!hasPosts ? (
        <div className="flex flex-col items-center justify-center p-12 border rounded-2xl bg-card text-center">
          <MessageSquare className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
          <h2 className="text-lg font-semibold mb-2">No saved posts</h2>
          <p className="text-muted-foreground mb-6">
            When you see a post you want to return to, click the bookmark icon to save it here.
          </p>
          <Link href="/feed">
            <Button>Go to Feed</Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {savedItems.map((item: any) => {
            const post = item.posts;
            if (!post) return null;
            const author = post.profiles;
            
            return (
              <Link key={item.id} href={`/posts/${post.id}`} className="block">
                <div className="border rounded-xl p-4 bg-card hover:border-primary transition-colors">
                  <div className="flex items-center gap-3 mb-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={author?.avatar_url || undefined} />
                      <AvatarFallback>{(author?.full_name || author?.username || "U")[0]?.toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-sm leading-none mb-1">{author?.full_name || author?.username}</p>
                      <p className="text-xs text-muted-foreground">@{author?.username} • {formatRelativeTime(post.created_at)}</p>
                    </div>
                  </div>
                  <p className="text-sm line-clamp-3">{post.content}</p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
