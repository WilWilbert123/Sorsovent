"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Check, UserPlus, Loader2, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

interface RSVPButtonProps {
  eventId: string;
  initialIsAttending: boolean;
}

export function RSVPButton({ eventId, initialIsAttending }: RSVPButtonProps) {
  const [isAttending, setIsAttending] = useState(initialIsAttending);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  async function handleToggleRSVP() {
    startTransition(async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push("/auth/login");
        return;
      }

      if (isAttending) {
        // Leave event
        const { error } = await supabase
          .from("event_attendees")
          .delete()
          .eq("event_id", eventId)
          .eq("user_id", user.id);

        if (error) {
          toast.error("Failed to leave event: " + error.message);
        } else {
          setIsAttending(false);
          toast.success("You have left this event.");
          router.refresh();
        }
      } else {
        // Join event
        const { error } = await supabase.from("event_attendees").upsert(
          {
            event_id: eventId,
            user_id: user.id,
            status: "attending",
          },
          { onConflict: "event_id,user_id" }
        );

        if (error) {
          toast.error("Failed to join event: " + error.message);
        } else {
          setIsAttending(true);
          toast.success("RSVP Successful! You can now access the Event Group Chat.");
          router.refresh();
        }
      }
    });
  }

  return (
    <div className="space-y-2">
      <Button
        onClick={handleToggleRSVP}
        disabled={isPending}
        variant={isAttending ? "secondary" : "default"}
        className="w-full text-base h-12 gap-2"
      >
        {isPending ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : isAttending ? (
          <>
            <Check className="h-5 w-5 text-emerald-500" />
            You're Attending
          </>
        ) : (
          <>
            <UserPlus className="h-5 w-5" />
            I'm Going
          </>
        )}
      </Button>

      {isAttending && (
        <Link href={`/events/${eventId}/chat`} className="block w-full">
          <Button className="w-full h-11 gap-2 bg-emerald-600 hover:bg-emerald-700 text-white">
            <MessageSquare className="h-4 w-4" />
            Open Event Chat
          </Button>
        </Link>
      )}
    </div>
  );
}
