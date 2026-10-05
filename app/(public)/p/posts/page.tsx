import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { formatRelativeTime } from "@/lib/utils/format";
import { MessageSquare, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default async function PublicPostsPage() {
  const supabase = await createClient();
  
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
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold">Community Feed</h1>
          <p className="text-muted-foreground mt-1">See what people are talking about</p>
        </div>
        <Link href="/auth/login">
          <Button>Sign in to post</Button>
        </Link>
      </div>

      {!posts || posts.length === 0 ? (
        <div className="text-center py-12 border rounded-2xl bg-card">
          <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4 opacity-50" />
          <h2 className="text-lg font-semibold mb-2">No posts yet</h2>
          <p className="text-muted-foreground">Be the first to share something with the community.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {posts.map((post: any) => {
            const author = post.profiles;
            
            return (
              <div key={post.id} className="border rounded-2xl p-5 bg-card hover:shadow-sm transition-shadow">
                <div className="flex items-center gap-3 mb-4">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={author?.avatar_url || undefined} />
                    <AvatarFallback>{(author?.full_name || author?.username || "U")[0]?.toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold">{author?.full_name || author?.username}</p>
                    <p className="text-sm text-muted-foreground">
                      @{author?.username} • {formatRelativeTime(post.created_at)}
                    </p>
                  </div>
                </div>
                
                <p className="mb-4 whitespace-pre-wrap">{post.content}</p>
                
                {post.post_media && post.post_media.length > 0 && post.post_media[0].media_type === "image" && (
                  <div className="mb-4 rounded-xl overflow-hidden border">
                    <img src={post.post_media[0].media_url} alt="Post attachment" className="w-full h-auto max-h-[400px] object-cover" />
                  </div>
                )}
                
                {post.location_name && (
                  <div className="flex items-center gap-1 text-xs font-medium text-primary mb-4 bg-primary/5 w-fit px-2 py-1 rounded-md">
                    <MapPin className="h-3 w-3" />
                    {post.location_name}
                  </div>
                )}
                
                <div className="pt-4 border-t flex justify-between">
                  <Link href="/auth/login" className="text-sm font-medium text-muted-foreground hover:text-foreground">
                    Sign in to like or comment
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
