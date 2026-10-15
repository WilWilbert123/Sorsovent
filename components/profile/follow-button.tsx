"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { UserPlus, UserMinus, Loader2 } from "lucide-react";
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
    if (isPending) return;

    const previousState = isFollowing;
    const nextState = !previousState;
    setIsFollowing(nextState);

    startTransition(async () => {
      try {
        const res = await fetch(`/api/users/${targetUserId}/follow`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });

        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.error || "Failed to update follow status");
        }

        setIsFollowing(json.isFollowing);
        if (json.isFollowing) {
          toast.success("Following!");
        } else {
          toast.info("Unfollowed");
        }
        router.refresh();
      } catch (err: any) {
        setIsFollowing(previousState);
        toast.error(err.message || "Failed to follow.");
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
