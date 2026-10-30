"use client";

import { useState, useEffect, useTransition } from "react";
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

  useEffect(() => {
    setIsAttending(initialIsAttending);
  }, [initialIsAttending]);

  async function handleToggleRSVP() {
    startTransition(async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

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
    <div
      className={
        isAttending
          ? "grid grid-cols-2 gap-2.5 w-full"
          : "w-full"
      }
    >
      <Button
        onClick={handleToggleRSVP}
        disabled={isPending}
        variant={isAttending ? "outline" : "default"}
        className={
          isAttending
            ? "w-full h-10 rounded-2xl text-xs sm:text-sm font-bold gap-1.5 border-emerald-500/35 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/15 cursor-pointer"
            : "w-full h-11 rounded-2xl text-sm font-bold gap-2 bg-gradient-to-r from-[#FF5E3A] via-[#FF3366] to-[#E11D48] hover:opacity-95 text-white border-0 shadow-md shadow-[#FF3366]/25 cursor-pointer"
        }
      >
        {isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : isAttending ? (
          <>
            <Check className="h-4 w-4 text-emerald-500 stroke-[2.5]" />
            <span>You&apos;re Going</span>
          </>
        ) : (
          <>
            <UserPlus className="h-4 w-4" />
            <span>Join Event (I&apos;m Going)</span>
          </>
        )}
      </Button>

      {isAttending && (
        <Link href={`/events/${eventId}/chat`} className="block w-full">
          <Button className="w-full h-10 rounded-2xl text-xs sm:text-sm font-bold gap-1.5 bg-gradient-to-r from-[#FF5E3A] via-[#FF3366] to-[#E11D48] hover:opacity-95 text-white border-0 shadow-sm cursor-pointer">
            <MessageSquare className="h-4 w-4" />
            <span>Event Group Chat</span>
          </Button>
        </Link>
      )}
    </div>
  );
}
