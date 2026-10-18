import { createClient as createAdminClient } from "@supabase/supabase-js";
import { adminMessaging, getAdminMessaging } from "@/lib/firebase/admin";

function getAdminSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createAdminClient(url, key);
}

export interface SendNotificationOptions {
  userId: string; // Recipient of the notification (e.g. post owner, comment author)
  actorId: string; // Actor who triggered it (e.g. liker, commenter)
  type: "like" | "comment" | "reply" | "comment_like" | "event_join" | "event_chat" | "follow";
  postId?: string | null;
  commentId?: string | null;
  eventId?: string | null;
  customTitle?: string;
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
  commentId,
  eventId,
  customTitle,
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
    } else if (type === "comment_like" && commentId) {
      let query = admin
        .from("notifications")
        .select("id")
        .eq("user_id", userId)
        .eq("actor_id", actorId)
        .eq("type", "comment_like");

      if (postId) query = query.eq("post_id", postId);

      const { data: existing } = await query.maybeSingle();
      if (existing) {
        return existing;
      }
    }

    // 3. Insert notification row (with graceful fallback if comment_id column not yet migrated)
    const insertPayload: any = {
      user_id: userId,
      actor_id: actorId,
      type,
      post_id: postId || null,
      event_id: eventId || null,
      is_read: false,
    };
    if (commentId) {
      insertPayload.comment_id = commentId;
    }

    let { data: notif, error: insertError } = await admin
      .from("notifications")
      .insert(insertPayload)
      .select("id, type, user_id, actor_id, post_id, event_id, created_at")
      .single();

    if (insertError && insertError.message?.includes("comment_id")) {
      delete insertPayload.comment_id;
      const fallback = await admin
        .from("notifications")
        .insert(insertPayload)
        .select("id, type, user_id, actor_id, post_id, event_id, created_at")
        .single();
      notif = fallback.data;
      insertError = fallback.error;
    }

    if (insertError) {
      console.error("Failed to insert notification:", insertError);
      return null;
    }

    // 4. Send Web/Mobile Push Notification if FCM is available and user preferences allow
    try {
      const messaging = adminMessaging || getAdminMessaging();
      if (messaging) {
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
        if ((type === "like" || type === "comment_like") && pushPrefs.likes === false) {
          return notif;
        }
        if ((type === "comment" || type === "reply") && pushPrefs.comments === false) {
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

        let pushTitle = customTitle || "New notification on Mingle";
        let pushBody = customText || `${actorName} interacted with your account.`;

        if (!customTitle || !customText) {
          if (type === "like") {
            pushTitle = "New Reaction ❤️";
            pushBody = `${actorName} liked your post.`;
          } else if (type === "comment_like") {
            pushTitle = "Comment Liked ❤️";
            pushBody = `${actorName} liked your comment.`;
          } else if (type === "reply") {
            pushTitle = "New Reply 💬";
            pushBody = customText
              ? `${actorName} replied: "${customText.slice(0, 80)}"`
              : `${actorName} replied to your comment.`;
          } else if (type === "comment") {
            pushTitle = "New Comment 💬";
            pushBody = customText
              ? `${actorName} commented: "${customText.slice(0, 80)}"`
              : `${actorName} commented on your post.`;
          } else if (type === "event_join") {
            pushTitle = "New Event Attendee 🎉";
            pushBody = `${actorName} joined your event.`;
          } else if (type === "follow") {
            pushTitle = "New Follower 👤";
            pushBody = `${actorName} started following you.`;
          }
        }

        // Get recipient push tokens
        const { data: tokenRows } = await admin
          .from("user_push_tokens")
          .select("token")
          .eq("user_id", userId);

        if (tokenRows && tokenRows.length > 0) {
          const tokens = tokenRows.map((r) => r.token).filter(Boolean);
          if (tokens.length > 0) {
            const multicastRes = await messaging.sendEachForMulticast({
              tokens,
              notification: {
                title: pushTitle,
                body: pushBody,
              },
              data: {
                url: postId ? `/home#post-${postId}` : eventId ? `/events/${eventId}` : "/notifications",
                postId: postId || "",
                type: type,
              },
            });

            // Automatically clean up inactive/stale device tokens
            if (multicastRes.failureCount > 0) {
              const staleTokens: string[] = [];
              multicastRes.responses.forEach((resp, idx) => {
                if (!resp.success) {
                  const errCode = resp.error?.code;
                  if (
                    errCode === "messaging/registration-token-not-registered" ||
                    errCode === "messaging/invalid-registration-token"
                  ) {
                    staleTokens.push(tokens[idx]);
                  }
                }
              });
              if (staleTokens.length > 0) {
                await admin.from("user_push_tokens").delete().in("token", staleTokens);
              }
            }
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
 * Removes an in-app notification (for instance when a user unlikes a post or comment).
 */
export async function removeInAppNotification({
  userId,
  actorId,
  type,
  postId,
  commentId,
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
    if (commentId) {
      query = query.eq("comment_id", commentId);
    }

    await query;
  } catch (err) {
    console.error("removeInAppNotification error:", err);
  }
}

