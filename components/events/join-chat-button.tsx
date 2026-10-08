"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { UserPlus, Loader2 } from "lucide-react";
import { toast } from "sonner";

export function JoinChatButton({ eventId }: { eventId: string }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  async function handleJoin() {
    startTransition(async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push("/auth/login");
        return;
      }

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
        toast.success("Joined event! You can now participate in the chat.");
        router.refresh();
      }
    });
  }

  return (
    <Button onClick={handleJoin} disabled={isPending} className="gap-2">
      {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
      Join Event to Chat
    </Button>
  );
}
