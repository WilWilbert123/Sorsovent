import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { MessagesView } from "@/components/messages/messages-view";

export default async function MessagesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  // 1. Fetch events created by the user
  const { data: createdEvents } = await supabase
    .from("events")
    .select("*")
    .eq("creator_id", user.id)
    .order("created_at", { ascending: false });

  // 2. Fetch events attended by the user (any status)
  const { data: attendanceRows } = await supabase
    .from("event_attendees")
    .select("event_id, events(*)")
    .eq("user_id", user.id);

  const attendedEvents = (attendanceRows || [])
    .map((r: any) => r.events)
    .filter(Boolean);

  // Combine unique joined events
  const allEventsMap = new Map<string, any>();

  (createdEvents || []).forEach((e) => {
    allEventsMap.set(e.id, { ...e, isCreator: true });
  });

  (attendedEvents || []).forEach((e) => {
    if (!allEventsMap.has(e.id)) {
      allEventsMap.set(e.id, {
        ...e,
        isCreator: e.creator_id === user.id || e.organizer_id === user.id,
      });
    }
  });

  const joinedEvents = Array.from(allEventsMap.values());

  // Fetch latest message for each joined event group chat
  const eventChats = await Promise.all(
    joinedEvents.map(async (event) => {
      const { data: msg } = await supabase
        .from("event_messages")
        .select("content, created_at, sender:profiles(full_name, display_name, username)")
        .eq("event_id", event.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const senderProfile: any = msg?.sender;
      const senderName =
        senderProfile?.full_name ||
        senderProfile?.display_name ||
        senderProfile?.username ||
        "Attendee";

      return {
        id: event.id,
        title: event.title,
        category: event.category,
        location_name: event.location_name,
        isCreator: event.isCreator,
        latestMessage: msg
          ? {
              content: msg.content,
              created_at: msg.created_at,
              senderName,
            }
          : null,
      };
    })
  );

  return <MessagesView eventChats={eventChats} />;
}
