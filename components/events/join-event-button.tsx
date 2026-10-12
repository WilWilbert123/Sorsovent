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
          try {
            const { data: ev } = await supabase
              .from("events")
              .select("creator_id")
              .eq("id", eventId)
              .maybeSingle();

            if (ev?.creator_id) {
              await supabase
                .from("notifications")
                .delete()
                .eq("user_id", ev.creator_id)
                .eq("actor_id", userId)
                .eq("type", "event_join")
                .eq("event_id", eventId);
            }
          } catch (_) {}
          router.refresh();
        }
      } else {
        // Join event
        const { error } = await supabase
          .from("event_attendees")
          .upsert(
            { event_id: eventId, user_id: userId, status: "attending" },
            { onConflict: "event_id,user_id" }
          );

        if (error) {
          toast.error("Failed to join event: " + error.message);
        } else {
          setIsAttending(true);
          toast.success("You're going! 🎉");
          try {
            const { data: ev } = await supabase
              .from("events")
              .select("creator_id")
              .eq("id", eventId)
              .maybeSingle();

            if (ev?.creator_id && ev.creator_id !== userId) {
              await supabase.from("notifications").insert({
                user_id: ev.creator_id,
                actor_id: userId,
                type: "event_join",
                event_id: eventId,
                is_read: false,
              });
            }
          } catch (notifErr) {
            console.warn("Could not notify event creator:", notifErr);
          }
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
