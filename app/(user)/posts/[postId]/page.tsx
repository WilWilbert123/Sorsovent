import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { formatRelativeTime } from "@/lib/utils/format";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Heart, MessageCircle, Share2, MapPin } from "lucide-react";

export default async function PostDetailsPage({ params }: { params: { postId: string } }) {
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

  const author = post.profiles as any;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="mb-6">
        <Link href="/feed" className="text-sm text-muted-foreground hover:text-foreground transition-colors mb-2 inline-block">
          ← Back to Feed
        </Link>
      </div>

      <div className="border rounded-2xl p-6 bg-card">
        <div className="flex items-center gap-3 mb-4">
          <Link href={`/profile/${author?.username}`}>
            <Avatar className="h-10 w-10">
              <AvatarImage src={author?.avatar_url || undefined} />
              <AvatarFallback>{(author?.full_name || author?.username || "U")[0]?.toUpperCase()}</AvatarFallback>
            </Avatar>
          </Link>
          <div>
            <Link href={`/profile/${author?.username}`} className="font-semibold hover:underline">
              {author?.full_name || author?.username}
            </Link>
            <p className="text-sm text-muted-foreground">
              @{author?.username} • {formatRelativeTime(post.created_at)}
            </p>
          </div>
        </div>

        <p className="text-base md:text-lg mb-4 whitespace-pre-wrap">{post.content}</p>

        {post.post_media && post.post_media.length > 0 && (
          <div className="mb-4 rounded-xl overflow-hidden border">
            {post.post_media[0].media_type === "image" ? (
               <img src={post.post_media[0].media_url} alt="Post attachment" className="w-full h-auto object-cover max-h-[500px]" />
            ) : (
               <div className="bg-muted p-8 text-center text-muted-foreground">Media type not supported</div>
            )}
          </div>
        )}

        {post.location_name && (
          <div className="flex items-center gap-1 text-sm text-primary mb-4 bg-primary/5 w-fit px-2 py-1 rounded-md">
            <MapPin className="h-3 w-3" />
            {post.location_name}
          </div>
        )}

        <div className="flex items-center justify-between border-t pt-4 mt-2">
          <button className="flex items-center gap-2 text-muted-foreground hover:text-red-500 transition-colors group">
            <div className="p-2 rounded-full group-hover:bg-red-500/10">
              <Heart className="h-5 w-5" />
            </div>
            <span className="text-sm font-medium">{post.like_count || 0}</span>
          </button>
          
          <button className="flex items-center gap-2 text-muted-foreground hover:text-blue-500 transition-colors group">
            <div className="p-2 rounded-full group-hover:bg-blue-500/10">
              <MessageCircle className="h-5 w-5" />
            </div>
            <span className="text-sm font-medium">{post.comment_count || 0}</span>
          </button>
          
          <button className="flex items-center gap-2 text-muted-foreground hover:text-green-500 transition-colors group">
            <div className="p-2 rounded-full group-hover:bg-green-500/10">
              <Share2 className="h-5 w-5" />
            </div>
          </button>
        </div>
      </div>

      <div className="mt-6 border rounded-2xl bg-card p-6">
        <h3 className="font-semibold mb-4">Comments</h3>
        <div className="text-center text-muted-foreground py-8">
          <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>Be the first to comment on this post.</p>
        </div>
      </div>
    </div>
  );
}
