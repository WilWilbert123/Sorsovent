"use client";

import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { MapPin, Image as ImageIcon, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface CreatePostCardProps {
  profile: {
    username: string | null;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
  userId: string;
}

export function CreatePostCard({ profile, userId }: CreatePostCardProps) {
  const [content, setContent] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const displayName = profile?.full_name || "User";
  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  async function handleSubmit() {
    if (!content.trim()) return;

    setIsLoading(true);
    const supabase = createClient();

    const { error } = await supabase.from("posts").insert({
      author_id: userId,
      content: content.trim(),
    });

    if (error) {
      toast.error("Failed to create post. Please try again.");
    } else {
      setContent("");
      toast.success("Post created!");
      router.refresh();
    }
    setIsLoading(false);
  }

  return (
    <Card className="border shadow-sm">
      <CardContent className="pt-4">
        <div className="flex gap-3">
          <Avatar className="h-10 w-10 shrink-0">
            <AvatarImage src={profile?.avatar_url || undefined} alt={displayName} />
            <AvatarFallback className="text-xs">{initials}</AvatarFallback>
          </Avatar>
          <div className="flex-1 space-y-3">
            <Textarea
              placeholder="What's happening around you?"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="resize-none border-0 bg-transparent text-base placeholder:text-muted-foreground focus-visible:ring-0 p-0 min-h-[60px]"
              disabled={isLoading}
            />
            <div className="flex items-center justify-between border-t pt-3">
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" className="text-muted-foreground gap-2">
                  <ImageIcon className="h-4 w-4" />
                  <span className="hidden sm:inline">Photo</span>
                </Button>
                <Button variant="ghost" size="sm" className="text-muted-foreground gap-2">
                  <MapPin className="h-4 w-4" />
                  <span className="hidden sm:inline">Location</span>
                </Button>
              </div>
              <Button
                size="sm"
                onClick={handleSubmit}
                disabled={!content.trim() || isLoading}
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Post
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
