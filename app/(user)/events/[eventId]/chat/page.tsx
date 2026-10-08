import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import { MessageSquareOff, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { EventChatRoom } from "@/components/events/event-chat-room";
import { JoinChatButton } from "@/components/events/join-chat-button";

export default async function EventChatPage({
  params,
}: {
  params: Promise<{ eventId: string }> | { eventId: string };
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const resolvedParams = await params;
  const eventId = resolvedParams?.eventId;

  if (!eventId) notFound();

  // Fetch event details
  const { data: event } = await supabase
    .from("events")
    .select("*")
    .eq("id", eventId)
    .single();

  if (!event) notFound();

  // Fetch current user profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  const isOrganizer = user.id === event.creator_id || user.id === event.organizer_id;

  // Check attendance status
  const { data: attendance } = await supabase
    .from("event_attendees")
    .select("status")
    .eq("event_id", eventId)
    .eq("user_id", user.id)
    .single();

  const isAttending = isOrganizer || Boolean(attendance);

  if (!isAttending) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 h-[calc(100vh-4rem)] flex flex-col">
        <div className="mb-6">
          <Link
            href={`/events/${eventId}`}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors mb-2 inline-flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Event
          </Link>
          <h1 className="text-2xl font-bold">{event.title} - Chat</h1>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center text-center p-8 border rounded-2xl bg-card shadow-sm">
          <div className="h-20 w-20 bg-primary/10 rounded-full flex items-center justify-center mb-6">
            <MessageSquareOff className="h-10 w-10 text-primary opacity-60" />
          </div>
          <h2 className="text-xl font-semibold mb-2">Private Event Chat</h2>
          <p className="text-muted-foreground max-w-sm mx-auto mb-6 text-sm">
            You must be attending <strong>"{event.title}"</strong> to view and participate in the group chat.
          </p>
          <JoinChatButton eventId={eventId} />
        </div>
      </div>
    );
  }

  // Fetch initial event messages
  const { data: initialMessages } = await supabase
    .from("event_messages")
    .select("*, sender:profiles(id, display_name, full_name, username, avatar_url)")
    .eq("event_id", eventId)
    .order("created_at", { ascending: true });

  const currentUser = {
    id: user.id,
    name: profile?.full_name || profile?.display_name || profile?.username || user.email?.split("@")[0] || "User",
    username: profile?.username || user.email?.split("@")[0] || "user",
    avatar: profile?.avatar_url,
  };

  return (
    <EventChatRoom
      eventId={eventId}
      eventTitle={event.title}
      currentUser={currentUser}
      initialMessages={initialMessages || []}
    />
  );
}
