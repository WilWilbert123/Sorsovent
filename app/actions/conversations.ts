"use server";

import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

import { createInAppNotification } from "@/lib/notifications/service";

function getServiceRoleSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
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
    .select(`
      conversation_id,
      conversations!inner(id, type)
    `)
    .eq("user_id", user.id)
    .eq("conversations.type", "direct");

  if (myMembershipsError) {
    console.error("Error finding my conversations:", myMembershipsError);
  }

  if (myMemberships && myMemberships.length > 0) {
    const candidateConversationIds = myMemberships.map((m: any) => m.conversation_id);

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
    .select(`
      id,
      content,
      sender_id,
      created_at,
      profiles!messages_sender_id_fkey (
        username,
        full_name,
        avatar_url
      )
    `)
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
