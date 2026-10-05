"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { UserPlus, UserMinus, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface FollowButtonProps {
  targetUserId: string;
  currentUserId: string;
  isFollowing: boolean;
}

export function FollowButton({ targetUserId, currentUserId, isFollowing: initial }: FollowButtonProps) {
  const [isFollowing, setIsFollowing] = useState(initial);
  const [isHovering, setIsHovering] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  async function handleToggle() {
    startTransition(async () => {
      const supabase = createClient();

      if (isFollowing) {
        const { error } = await supabase
          .from("follows")
          .delete()
          .eq("follower_id", currentUserId)
          .eq("following_id", targetUserId);

        if (error) {
          toast.error("Failed to unfollow.");
        } else {
          setIsFollowing(false);
          router.refresh();
        }
      } else {
        const { error } = await supabase
          .from("follows")
          .insert({ follower_id: currentUserId, following_id: targetUserId });

        if (error) {
          toast.error("Failed to follow.");
        } else {
          setIsFollowing(true);
          toast.success("Following!");
          router.refresh();
        }
      }
    });
  }

  return (
    <Button
      variant={isFollowing ? "outline" : "default"}
      size="sm"
      onClick={handleToggle}
      disabled={isPending}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      className="gap-2 min-w-[110px]"
    >
      {isPending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : isFollowing ? (
        <>
          {isHovering ? (
            <>
              <UserMinus className="h-4 w-4" />
              Unfollow
            </>
          ) : (
            "Following ✓"
          )}
        </>
      ) : (
        <>
          <UserPlus className="h-4 w-4" />
          Follow
        </>
      )}
    </Button>
  );
}
