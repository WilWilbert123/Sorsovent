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
      .select("id, title, category, location_name, cover_image, creator_id, organizer_id")
      .eq("creator_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("event_attendees")
      .select("event_id, events(id, title, category, location_name, cover_image, creator_id, organizer_id)")
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
  const directConversations = directMembershipsRes.data || [];
  const directConvIds = directConversations.map((m: any) => m.conversation_id);

  // 2. Fetch event messages and direct message details in PARALLEL
  const [eventChats, directMessages] = await Promise.all([
    // Parallel event chat message resolution
    Promise.all(
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
      })
    ),

    // Parallel direct message resolution with batch other member query
    (async () => {
      if (directConvIds.length === 0) return [];

      // Batch query ALL other members in a single roundtrip
      const { data: allOtherMembers } = await adminClient
        .from("conversation_members")
        .select(`
          conversation_id,
          user_id,
          profiles!conversation_members_user_id_fkey (
            id,
            username,
            full_name,
            display_name,
            avatar_url
          )
        `)
        .in("conversation_id", directConvIds)
        .neq("user_id", user.id);

      const otherMembersMap = new Map<string, any>();
      (allOtherMembers || []).forEach((row: any) => {
        otherMembersMap.set(row.conversation_id, row);
      });

      // Fetch latest messages in parallel
      const dms = await Promise.all(
        directConversations.map(async (item: any) => {
          const convId = item.conversation_id;
          const otherMemberRow = otherMembersMap.get(convId);
          const otherProfile: any = otherMemberRow?.profiles;

          const { data: latestMsg } = await adminClient
            .from("messages")
            .select("content, created_at, sender_id")
            .eq("conversation_id", convId)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          return {
            id: convId,
            otherUser: {
              id: otherProfile?.id || otherMemberRow?.user_id || "",
              username: otherProfile?.username || "user",
              displayName:
                otherProfile?.full_name ||
                otherProfile?.display_name ||
                otherProfile?.username ||
                "Sorsovent Member",
              avatarUrl: otherProfile?.avatar_url || null,
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
        })
      );

      // Only display conversations that actually have messages sent
      const activeDms = dms.filter((dm) => dm.latestMessage !== null);

      activeDms.sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );

      return activeDms;
    })(),
  ]);

  return (
    <MessagesView
      eventChats={eventChats}
      directMessages={directMessages}
      initialTab={initialTab}
    />
  );
}
