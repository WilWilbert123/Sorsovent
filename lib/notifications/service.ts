import { createClient as createAdminClient } from "@supabase/supabase-js";
import { adminMessaging } from "@/lib/firebase/admin";

function getAdminSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createAdminClient(url, key);
}

export interface SendNotificationOptions {
  userId: string; // Recipient of the notification (e.g. post owner)
  actorId: string; // Actor who triggered it (e.g. liker, commenter)
  type: "like" | "comment" | "event_join" | "event_chat" | "follow";
  postId?: string | null;
  eventId?: string | null;
  customText?: string;
}

/**
 * Creates an in-app notification in public.notifications and sends an optional FCM push notification.
 * Never notifies the actor if they are the recipient.
 */
export async function createInAppNotification({
  userId,
  actorId,
  type,
  postId,
  eventId,
  customText,
}: SendNotificationOptions) {
  try {
    // 1. Never notify oneself
    if (!userId || !actorId || userId === actorId) {
      return null;
    }

    const admin = getAdminSupabase();

    // 2. Prevent duplicate notifications for likes
    if (type === "like" && postId) {
      const { data: existing } = await admin
        .from("notifications")
        .select("id")
        .eq("user_id", userId)
        .eq("actor_id", actorId)
        .eq("type", "like")
        .eq("post_id", postId)
        .maybeSingle();

      if (existing) {
        return existing;
      }
    }

    // 3. Insert notification row
    const { data: notif, error: insertError } = await admin
      .from("notifications")
      .insert({
        user_id: userId,
        actor_id: actorId,
        type,
        post_id: postId || null,
        event_id: eventId || null,
        is_read: false,
      })
      .select("id, type, user_id, actor_id, post_id, event_id, created_at")
      .single();

    if (insertError) {
      console.error("Failed to insert notification:", insertError);
      return null;
    }

    // 4. Send Web/Mobile Push Notification if FCM is available and user preferences allow
    try {
      if (adminMessaging) {
        // Check recipient's push notification preferences
        const { data: recipientProfile } = await admin
          .from("profiles")
          .select("privacy_settings")
          .eq("id", userId)
          .maybeSingle();

        const pushPrefs = recipientProfile?.privacy_settings?.push_notifications ?? {
          enabled: true,
          likes: true,
          comments: true,
          chats: true,
          events: true,
        };

        // If master push switch is disabled, skip sending push notification
        if (pushPrefs.enabled === false) {
          return notif;
        }

        // Check granular push preferences per category
        if (type === "like" && pushPrefs.likes === false) {
          return notif;
        }
        if (type === "comment" && pushPrefs.comments === false) {
          return notif;
        }
        if (type === "event_join" && pushPrefs.events === false) {
          return notif;
        }
        if (type === "event_chat" && pushPrefs.chats === false) {
          return notif;
        }

        // Fetch actor details for title
        const { data: actorProfile } = await admin
          .from("profiles")
          .select("display_name, username, full_name")
          .eq("id", actorId)
          .maybeSingle();

        const actorName =
          actorProfile?.display_name ||
          actorProfile?.full_name ||
          actorProfile?.username ||
          "Someone";

        let pushTitle = "New notification on Sorsovent";
        let pushBody = `${actorName} interacted with your account.`;

        if (type === "like") {
          pushTitle = "New Post Reaction ❤️";
          pushBody = `${actorName} liked your post.`;
        } else if (type === "comment") {
          pushTitle = "New Comment 💬";
          pushBody = customText
            ? `${actorName}: "${customText.slice(0, 80)}"`
            : `${actorName} commented on your post.`;
        } else if (type === "event_join") {
          pushTitle = "New Event Attendee 🎉";
          pushBody = `${actorName} joined your event.`;
        } else if (type === "follow") {
          pushTitle = "New Follower 👤";
          pushBody = `${actorName} started following you.`;
        }

        // Get recipient push tokens
        const { data: tokenRows } = await admin
          .from("user_push_tokens")
          .select("token")
          .eq("user_id", userId);

        if (tokenRows && tokenRows.length > 0) {
          const tokens = tokenRows.map((r) => r.token).filter(Boolean);
          if (tokens.length > 0) {
            await adminMessaging.sendEachForMulticast({
              tokens,
              notification: {
                title: pushTitle,
                body: pushBody,
              },
              data: {
                url: postId ? `/home#post-${postId}` : eventId ? `/events/${eventId}` : "/notifications",
              },
            });
          }
        }
      }
    } catch (pushErr) {
      // Don't fail the in-app notification if push fails
      console.warn("FCM push delivery warning:", pushErr);
    }

    return notif;
  } catch (error) {
    console.error("createInAppNotification error:", error);
    return null;
  }
}

/**
 * Removes an in-app notification (for instance when a user unlikes a post).
 */
export async function removeInAppNotification({
  userId,
  actorId,
  type,
  postId,
  eventId,
}: Partial<SendNotificationOptions>) {
  try {
    if (!userId || !actorId || !type) return;

    const admin = getAdminSupabase();
    let query = admin
      .from("notifications")
      .delete()
      .eq("user_id", userId)
      .eq("actor_id", actorId)
      .eq("type", type);

    if (postId) {
      query = query.eq("post_id", postId);
    }
    if (eventId) {
      query = query.eq("event_id", eventId);
    }

    await query;
  } catch (err) {
    console.error("removeInAppNotification error:", err);
  }
}
