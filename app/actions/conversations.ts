"use server";

import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createInAppNotification } from "@/lib/notifications/service";

function getServiceRoleSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createAdminClient(url, key);
}

/**
 * Finds an existing 1-on-1 direct conversation between current user and target user,
 * or creates a new conversation and adds both users as members.
 */
export async function getOrCreateDirectConversation(targetUserId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("You must be logged in to send messages");
  }

  if (user.id === targetUserId) {
    throw new Error("You cannot direct message yourself");
  }

  const adminClient = getServiceRoleSupabase();

  // Find all direct conversations that the current user is part of
  const { data: myMemberships, error: myMembershipsError } = await adminClient
    .from("conversation_members")
    .select(
      `
      conversation_id,
      conversations!inner(id, type)
    `
    )
    .eq("user_id", user.id)
    .eq("conversations.type", "direct");

  if (myMembershipsError) {
    console.error("Error finding my conversations:", myMembershipsError);
  }

  if (myMemberships && myMemberships.length > 0) {
    const candidateConversationIds = myMemberships.map(
      (m: any) => m.conversation_id
    );

    // Look for targetUserId in any of these candidate conversations
    const { data: commonMembership } = await adminClient
      .from("conversation_members")
      .select("conversation_id")
      .in("conversation_id", candidateConversationIds)
      .eq("user_id", targetUserId)
      .limit(1)
      .maybeSingle();

    if (commonMembership?.conversation_id) {
      return { conversationId: commonMembership.conversation_id };
    }
  }

  // Create a brand new direct conversation
  const { data: newConv, error: convError } = await adminClient
    .from("conversations")
    .insert({ type: "direct" })
    .select("id")
    .single();

  if (convError || !newConv) {
    console.error("Failed to create direct conversation:", convError);
    throw new Error("Could not start conversation");
  }

  // Add both users to conversation_members
  const { error: membersError } = await adminClient
    .from("conversation_members")
    .insert([
      { conversation_id: newConv.id, user_id: user.id },
      { conversation_id: newConv.id, user_id: targetUserId },
    ]);

  if (membersError) {
    console.error("Failed to add members to conversation:", membersError);
    throw new Error("Could not setup conversation members");
  }

  return { conversationId: newConv.id };
}

/**
 * Sends a message in a conversation.
 */
export async function sendDirectMessage({
  conversationId,
  content,
}: {
  conversationId: string;
  content: string;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("You must be logged in to send messages");
  }

  if (!content || !content.trim()) {
    throw new Error("Message content cannot be empty");
  }

  const adminClient = getServiceRoleSupabase();

  // Verify membership
  const { data: membership } = await adminClient
    .from("conversation_members")
    .select("id")
    .eq("conversation_id", conversationId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership) {
    throw new Error("You are not a member of this conversation");
  }

  const { data: newMsg, error: insertError } = await adminClient
    .from("messages")
    .insert({
      conversation_id: conversationId,
      sender_id: user.id,
      content: content.trim(),
    })
    .select(
      `
      id,
      content,
      sender_id,
      created_at,
      profiles!messages_sender_id_fkey (
        username,
        full_name,
        avatar_url
      )
    `
    )
    .single();

  if (insertError) {
    console.error("Failed to insert message:", insertError);
    throw new Error("Could not send message");
  }

  // Update conversation updated_at timestamp
  await adminClient
    .from("conversations")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", conversationId);

  // Send push notification & in-app notification to the other conversation participant(s)
  try {
    const { data: otherMembers } = await adminClient
      .from("conversation_members")
      .select("user_id")
      .eq("conversation_id", conversationId)
      .neq("user_id", user.id);

    const { data: senderProfile } = await adminClient
      .from("profiles")
      .select("display_name, full_name, username")
      .eq("id", user.id)
      .maybeSingle();

    const senderName =
      senderProfile?.display_name ||
      senderProfile?.full_name ||
      senderProfile?.username ||
      "Someone";

    if (otherMembers && otherMembers.length > 0) {
      for (const m of otherMembers) {
        await createInAppNotification({
          userId: m.user_id,
          actorId: user.id,
          type: "direct_message",
          customTitle: `💬 ${senderName}`,
          customText: content.trim().slice(0, 100),
          customUrl: `/messages/${conversationId}`,
        });
      }
    }
  } catch (notifErr) {
    console.warn("Direct message push delivery warning:", notifErr);
  }

  return { success: true, message: newMsg };
}

/**
 * Fetches latest messages for a direct conversation and marks unread direct_message
 * notifications from the other participant as read. Bypasses client RLS restrictions safely.
 */
export async function getConversationMessages(conversationId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { messages: [], unreadCleared: false };
  }

  const adminClient = getServiceRoleSupabase();

  const [membershipRes, messagesRes, otherMembersRes] = await Promise.all([
    adminClient
      .from("conversation_members")
      .select("id")
      .eq("conversation_id", conversationId)
      .eq("user_id", user.id)
      .maybeSingle(),
    adminClient
      .from("messages")
      .select(
        `
        id,
        content,
        sender_id,
        created_at,
        profiles!messages_sender_id_fkey (
          username,
          full_name,
          avatar_url
        )
      `
      )
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })
      .limit(100),
    adminClient
      .from("conversation_members")
      .select("user_id")
      .eq("conversation_id", conversationId)
      .neq("user_id", user.id),
  ]);

  if (!membershipRes.data) {
    return { messages: [], unreadCleared: false };
  }

  // Automatically mark unread direct_message notifications from the other user(s) as read
  const otherUserIds = (otherMembersRes.data || [])
    .map((m: any) => m.user_id)
    .filter(Boolean);
  let unreadCleared = false;

  if (otherUserIds.length > 0) {
    const { data: updatedRows } = await adminClient
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", user.id)
      .in("actor_id", otherUserIds)
      .eq("type", "direct_message")
      .eq("is_read", false)
      .select("id");

    unreadCleared = Boolean(updatedRows && updatedRows.length > 0);
  }

  return {
    messages: messagesRes.data || [],
    unreadCleared,
  };
}

/**
 * Fetches the latest Event Group Chats and Direct Message Conversations for the Chat Hub (/messages)
 * so that new conversations or messages appear live without requiring a browser refresh.
 */
export async function getUserChatsOverview() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { eventChats: [], directMessages: [] };
  }

  const adminClient = getServiceRoleSupabase();

  const [createdEventsRes, attendanceRowsRes, directMembershipsRes] =
    await Promise.all([
      supabase
        .from("events")
        .select("id, title, category, location_name, cover_image, creator_id")
        .eq("creator_id", user.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("event_attendees")
        .select(
          "event_id, events(id, title, category, location_name, cover_image, creator_id)"
        )
        .eq("user_id", user.id),
      adminClient
        .from("conversation_members")
        .select(
          `
        conversation_id,
        conversations!inner (
          id,
          type,
          updated_at
        )
      `
        )
        .eq("user_id", user.id)
        .eq("conversations.type", "direct"),
    ]);

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

  const [latestEventMsgsRes, allOtherMembersRes, allLatestDMsRes] =
    await Promise.all([
      joinedEventIds.length > 0
        ? supabase
            .from("event_messages")
            .select(
              "event_id, content, created_at, sender:profiles(full_name, display_name, username)"
            )
            .in("event_id", joinedEventIds)
            .order("created_at", { ascending: false })
        : Promise.resolve({ data: [] }),
      directConvIds.length > 0
        ? adminClient
            .from("conversation_members")
            .select(
              `
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
          `
            )
            .in("conversation_id", directConvIds)
            .neq("user_id", user.id)
        : Promise.resolve({ data: [] }),
      directConvIds.length > 0
        ? adminClient
            .from("messages")
            .select("conversation_id, content, created_at, sender_id")
            .in("conversation_id", directConvIds)
            .order("created_at", { ascending: false })
        : Promise.resolve({ data: [] }),
    ]);

  const latestEventMsgMap = new Map<string, any>();
  for (const msg of latestEventMsgsRes.data || []) {
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

  const otherMembersMap = new Map<string, any>();
  for (const row of allOtherMembersRes.data || []) {
    otherMembersMap.set(row.conversation_id, row);
  }

  const latestDMsMap = new Map<string, any>();
  for (const msg of allLatestDMsRes.data || []) {
    if (!latestDMsMap.has(msg.conversation_id)) {
      latestDMsMap.set(msg.conversation_id, msg);
    }
  }

  const dms = directConversations.map((item: any) => {
    const convId = item.conversation_id;
    const otherMemberRow = otherMembersMap.get(convId);
    const otherProfile: any = Array.isArray(otherMemberRow?.profiles)
      ? otherMemberRow.profiles[0]
      : otherMemberRow?.profiles;
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
      updatedAt:
        latestMsg?.created_at ||
        item.conversations?.updated_at ||
        new Date().toISOString(),
    };
  });

  const directMessages = dms
    .filter((dm) => dm.latestMessage !== null)
    .sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );

  return { eventChats, directMessages };
}
