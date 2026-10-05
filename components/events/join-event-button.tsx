"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle, Loader2, UserPlus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface JoinEventButtonProps {
  eventId: string;
  isAttending: boolean;
  userId: string;
}

export function JoinEventButton({ eventId, isAttending: initial, userId }: JoinEventButtonProps) {
  const [isAttending, setIsAttending] = useState(initial);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  async function handleToggle() {
    startTransition(async () => {
      const supabase = createClient();

      if (isAttending) {
        // Leave event
        const { error } = await supabase
          .from("event_attendees")
          .delete()
          .eq("event_id", eventId)
          .eq("user_id", userId);

        if (error) {
          toast.error("Failed to leave event.");
        } else {
          setIsAttending(false);
          toast.success("You have left the event.");
          router.refresh();
        }
      } else {
        // Join event
        const { error } = await supabase
          .from("event_attendees")
          .insert({ event_id: eventId, user_id: userId, rsvp_status: "going" });

        if (error) {
          toast.error("Failed to join event: " + error.message);
        } else {
          setIsAttending(true);
          toast.success("You're going! 🎉");
          router.refresh();
        }
      }
    });
  }

  return (
    <Button
      onClick={handleToggle}
      variant={isAttending ? "outline" : "default"}
      disabled={isPending}
      className="gap-2 flex-1 sm:flex-none"
    >
      {isPending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : isAttending ? (
        <CheckCircle className="h-4 w-4" />
      ) : (
        <UserPlus className="h-4 w-4" />
      )}
      {isAttending ? "Going ✓" : "Join Event"}
    </Button>
  );
}
