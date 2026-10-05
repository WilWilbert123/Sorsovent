import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { formatRelativeTime } from "@/lib/utils/format";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Heart, MessageCircle, Share2, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";

export default async function PublicPostDetailsPage({ params }: { params: { postId: string } }) {
  const supabase = await createClient();

  const { data: post } = await supabase
    .from("posts")
    .select(`
      id,
      content,
      created_at,
      location_name,
      like_count,
      comment_count,
      profiles!posts_author_id_fkey (
        username,
        full_name,
        avatar_url
      ),
      post_media (
        id,
        media_url,
        media_type
      )
    `)
    .eq("id", params.postId)
    .single();

  if (!post) notFound();

  const author = Array.isArray(post.profiles) ? post.profiles[0] : post.profiles;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="mb-6">
        <Link href="/posts" className="text-sm text-muted-foreground hover:text-foreground transition-colors mb-2 inline-block">
          ← Back to Community Feed
        </Link>
      </div>

      <div className="border rounded-2xl p-6 bg-card shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <Avatar className="h-12 w-12 border">
            <AvatarImage src={author?.avatar_url || undefined} />
            <AvatarFallback>{(author?.full_name || author?.username || "U")[0]?.toUpperCase()}</AvatarFallback>
          </Avatar>
          <div>
            <p className="font-semibold text-lg leading-tight">
              {author?.full_name || author?.username}
            </p>
            <p className="text-sm text-muted-foreground">
              @{author?.username} • {formatRelativeTime(post.created_at)}
            </p>
          </div>
        </div>

        <p className="text-lg md:text-xl mb-6 whitespace-pre-wrap leading-relaxed">{post.content}</p>

        {post.post_media && post.post_media.length > 0 && (
          <div className="mb-6 rounded-xl overflow-hidden border bg-muted">
            {post.post_media[0].media_type === "image" ? (
               <img src={post.post_media[0].media_url} alt="Post attachment" className="w-full h-auto object-cover max-h-[600px]" />
            ) : (
               <div className="p-8 text-center text-muted-foreground">Media type not supported</div>
            )}
          </div>
        )}

        {post.location_name && (
          <div className="flex items-center gap-1.5 text-sm font-medium text-primary mb-6 bg-primary/5 w-fit px-3 py-1.5 rounded-lg border border-primary/10">
            <MapPin className="h-4 w-4" />
            {post.location_name}
          </div>
        )}

        <div className="flex items-center gap-6 border-t pt-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Heart className="h-5 w-5" />
            <span className="text-sm font-medium">{post.like_count || 0}</span>
          </div>
          
          <div className="flex items-center gap-2 text-muted-foreground">
            <MessageCircle className="h-5 w-5" />
            <span className="text-sm font-medium">{post.comment_count || 0}</span>
          </div>
          
          <div className="flex items-center gap-2 text-muted-foreground">
            <Share2 className="h-5 w-5" />
          </div>
        </div>
      </div>

      <div className="mt-8 border rounded-2xl bg-card p-8 text-center shadow-sm">
        <MessageCircle className="h-10 w-10 mx-auto text-primary mb-4 opacity-80" />
        <h3 className="font-bold text-xl mb-2">Join the conversation</h3>
        <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
          Sign in to Sorsovent to leave a comment, like this post, and connect with {author?.full_name || author?.username}.
        </p>
        <Link href={`/auth/login?next=/posts/${post.id}`}>
          <Button size="lg">Sign In to Interact</Button>
        </Link>
        <p className="mt-4 text-sm text-muted-foreground">
          Don't have an account? <Link href="/auth/register" className="text-primary hover:underline">Sign up</Link>
        </p>
      </div>
    </div>
  );
}
