"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CloudinaryUpload } from "@/components/media/cloudinary-upload";
import { ImagePreview } from "@/components/media/image-preview";
import { MapPin, Loader2 } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

export default function CreatePostPage() {
  const [content, setContent] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [locationName, setLocationName] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim() && !imageUrl) {
      toast.error("Post must contain text or an image.");
      return;
    }

    startTransition(async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push("/auth/login");
        return;
      }

      // 1. Create the post
      const { data: post, error: postError } = await supabase
        .from("posts")
        .insert({
          author_id: user.id,
          content: content.trim(),
          location_name: locationName.trim() || null,
        })
        .select("id")
        .single();

      if (postError || !post) {
        toast.error(postError?.message || "Failed to create post");
        return;
      }

      // 2. Attach media if any
      if (imageUrl) {
        const { error: mediaError } = await supabase
          .from("post_media")
          .insert({
            post_id: post.id,
            media_type: "image",
            media_url: imageUrl,
          });
          
        if (mediaError) {
          console.error("Failed to attach media:", mediaError);
        }
      }

      toast.success("Post created!");
      router.push("/feed");
      router.refresh();
    });
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="mb-6">
        <Link href="/home" className="text-sm text-muted-foreground hover:text-foreground transition-colors mb-2 inline-block">
          ← Back
        </Link>
        <h1 className="text-2xl font-bold">Create Post</h1>
      </div>

      <form onSubmit={handleSubmit} className="border rounded-2xl p-6 bg-card shadow-sm space-y-6">
        <div className="space-y-2">
          <Textarea 
            placeholder="What's happening in Sorsogon?"
            className="min-h-[120px] resize-none text-base border-none focus-visible:ring-0 p-0 shadow-none bg-transparent"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            disabled={isPending}
          />
        </div>
        
        {imageUrl ? (
          <div className="mb-4">
            <ImagePreview 
              url={imageUrl} 
              onRemove={() => setImageUrl("")} 
              className="max-h-[300px]"
            />
          </div>
        ) : (
          <div className="pt-2 border-t">
            <p className="text-sm font-medium mb-3">Add to your post</p>
            <CloudinaryUpload 
              onUploadSuccess={(url) => setImageUrl(url)}
              folder="posts"
            />
          </div>
        )}

        <div className="space-y-2 pt-4 border-t">
          <label className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
            <MapPin className="h-4 w-4" /> Add Location (Optional)
          </label>
          <input 
            type="text"
            placeholder="e.g. Rompeolas, Sorsogon City"
            value={locationName}
            onChange={(e) => setLocationName(e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            disabled={isPending}
          />
        </div>

        <div className="flex justify-end pt-4 border-t">
          <Button type="submit" disabled={isPending || (!content.trim() && !imageUrl)}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Post
          </Button>
        </div>
      </form>
    </div>
  );
}
