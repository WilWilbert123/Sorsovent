import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { MessagesView } from "@/components/messages/messages-view";

function getServiceRoleSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createAdminClient(url, key);
}

export default async function MessagesPage({
  searchParams,
}: {
  searchParams?: Promise<{ tab?: string }> | { tab?: string };
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const resolvedSearchParams = searchParams ? await searchParams : {};
  const initialTab = resolvedSearchParams?.tab === "direct" ? "direct" : "event_chats";

  const adminClient = getServiceRoleSupabase();

  // 1. Fetch top-level data in PARALLEL to prevent sequential waterfalls
  const [createdEventsRes, attendanceRowsRes, directMembershipsRes] = await Promise.all([
    supabase
      .from("events")
      .select("id, title, category, location_name, cover_image, creator_id")
      .eq("creator_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("event_attendees")
      .select("event_id, events(id, title, category, location_name, cover_image, creator_id)")
      .eq("user_id", user.id),
    adminClient
      .from("conversation_members")
      .select(`
        conversation_id,
        conversations!inner (
          id,
          type,
          updated_at
        )
      `)
      .eq("user_id", user.id)
      .eq("conversations.type", "direct"),
  ]);

  // Combine unique joined events
  const allEventsMap = new Map<string, any>();

  (createdEventsRes.data || []).forEach((e: any) => {
    allEventsMap.set(e.id, { ...e, isCreator: true });
  });

  (attendanceRowsRes.data || []).forEach((r: any) => {
    const e = r.events;
    if (e && !allEventsMap.has(e.id)) {
      allEventsMap.set(e.id, {
        ...e,
        isCreator: e.creator_id === user.id || e.organizer_id === user.id,
      });
    }
  });

  const joinedEvents = Array.from(allEventsMap.values());
  const joinedEventIds = joinedEvents.map((e) => e.id);
  const directConversations = directMembershipsRes.data || [];
  const directConvIds = directConversations.map((m: any) => m.conversation_id);

  // 2. Fetch event messages, other members, and direct messages in BATCH (Single round-trip)
  const [latestEventMsgsRes, allOtherMembersRes, allLatestDMsRes] = await Promise.all([
    // Batch query latest event messages across all joined events
    joinedEventIds.length > 0
      ? supabase
          .from("event_messages")
          .select("event_id, content, created_at, sender:profiles(full_name, display_name, username)")
          .in("event_id", joinedEventIds)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [] }),

    // Batch query ALL other members in direct conversations
    directConvIds.length > 0
      ? adminClient
          .from("conversation_members")
          .select(`
            conversation_id,
            user_id,
            profiles!conversation_members_user_id_fkey (
              id,
              username,
              full_name,
              display_name,
              avatar_url,
              last_seen_at
            )
          `)
          .in("conversation_id", directConvIds)
          .neq("user_id", user.id)
      : Promise.resolve({ data: [] }),

    // Batch query ALL latest direct messages across all direct conversations
    directConvIds.length > 0
      ? adminClient
          .from("messages")
          .select("conversation_id, content, created_at, sender_id")
          .in("conversation_id", directConvIds)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [] }),
  ]);

  // Group latest event message per event in memory
  const latestEventMsgMap = new Map<string, any>();
  for (const msg of (latestEventMsgsRes.data || [])) {
    if (!latestEventMsgMap.has(msg.event_id)) {
      latestEventMsgMap.set(msg.event_id, msg);
    }
  }

  const eventChats = joinedEvents.map((event) => {
    const msg = latestEventMsgMap.get(event.id);
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
      cover_image: event.cover_image || null,
      isCreator: event.isCreator,
      latestMessage: msg
        ? {
            content: msg.content,
            created_at: msg.created_at,
            senderName,
          }
        : null,
    };
  });

  // Group other members and latest direct messages in memory
  const otherMembersMap = new Map<string, any>();
  for (const row of (allOtherMembersRes.data || [])) {
    otherMembersMap.set(row.conversation_id, row);
  }

  const latestDMsMap = new Map<string, any>();
  for (const msg of (allLatestDMsRes.data || [])) {
    if (!latestDMsMap.has(msg.conversation_id)) {
      latestDMsMap.set(msg.conversation_id, msg);
    }
  }

  const dms = directConversations.map((item: any) => {
    const convId = item.conversation_id;
    const otherMemberRow = otherMembersMap.get(convId);
    const otherProfile: any = otherMemberRow?.profiles;
    const latestMsg = latestDMsMap.get(convId);

    return {
      id: convId,
      otherUser: {
        id: otherProfile?.id || otherMemberRow?.user_id || "",
        username: otherProfile?.username || "user",
        displayName:
          otherProfile?.full_name ||
          otherProfile?.display_name ||
          otherProfile?.username ||
          "Mingle Member",
        avatarUrl: otherProfile?.avatar_url || null,
        lastSeenAt: otherProfile?.last_seen_at || null,
      },
      latestMessage: latestMsg
        ? {
            content: latestMsg.content,
            created_at: latestMsg.created_at,
            isFromMe: latestMsg.sender_id === user.id,
          }
        : null,
      updatedAt: latestMsg?.created_at || item.conversations?.updated_at || new Date().toISOString(),
    };
  });

  const directMessages = dms
    .filter((dm) => dm.latestMessage !== null)
    .sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );

  return (
    <MessagesView
      eventChats={eventChats}
      directMessages={directMessages}
      initialTab={initialTab}
    />
  );
}
