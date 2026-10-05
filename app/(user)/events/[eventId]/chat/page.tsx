import { createClient } from "@/lib/supabase/server";
import { MessageSquareOff } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function EventChatPage({ params }: { params: { eventId: string } }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  // Verify the user is an attendee to allow chat access
  const { data: attendance } = await supabase
    .from("event_attendees")
    .select("status")
    .eq("event_id", params.eventId)
    .eq("user_id", user.id)
    .single();

  const isAttending = attendance?.status === "attending";

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 h-[calc(100vh-4rem)] md:h-screen flex flex-col">
      <div className="mb-6">
        <Link href={`/events/${params.eventId}`} className="text-sm text-muted-foreground hover:text-foreground transition-colors mb-2 inline-block">
          ← Back to Event
        </Link>
        <h1 className="text-2xl font-bold">Event Chat</h1>
      </div>
      
      {!isAttending ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-8 border rounded-2xl bg-card shadow-sm">
          <div className="h-20 w-20 bg-primary/10 rounded-full flex items-center justify-center mb-6">
            <MessageSquareOff className="h-10 w-10 text-primary opacity-60" />
          </div>
          <h2 className="text-xl font-semibold mb-2">Private Group Chat</h2>
          <p className="text-muted-foreground max-w-sm mx-auto mb-6">
            You must be attending this event to view and participate in the group chat.
          </p>
          <Link href={`/events/${params.eventId}`}>
            <Button>View Event to RSVP</Button>
          </Link>
        </div>
      ) : (
        <div className="flex-1 border rounded-2xl bg-card shadow-sm overflow-hidden flex flex-col">
          {/* Chat Component goes here */}
          <div className="flex-1 overflow-y-auto p-4 flex flex-col justify-end text-center">
            <p className="text-sm text-muted-foreground py-8">
              Welcome to the event chat! Realtime messaging features are currently being provisioned.
            </p>
          </div>
          <div className="p-4 border-t bg-muted/30">
            <div className="flex gap-2">
              <input 
                type="text" 
                placeholder="Type a message..." 
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                disabled
              />
              <Button disabled>Send</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
