import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient as createAdminSupabaseClient } from "@supabase/supabase-js";
import { adminMessaging, getAdminMessaging } from "@/lib/firebase/admin";
import { getSafeRedirectPath } from "@/lib/security/sanitize";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { isAuthorizedAdmin } from "@/lib/admin/auth";
import { z } from "zod";

export const dynamic = "force-dynamic";

const sendPushSchema = z.object({
  targetUserIds: z.array(z.string().uuid()).min(1).max(100),
  title: z.string().min(1).max(150).optional(),
  body: z.string().max(500).optional(),
  url: z.string().max(300).optional(),
  eventId: z.string().uuid().optional().nullable(),
  postId: z.string().uuid().optional().nullable(),
  type: z
    .enum([
      "event_chat",
      "direct_message",
      "like",
      "comment",
      "comment_like",
      "reply",
      "event_join",
      "follow",
    ])
    .optional(),
});

export async function POST(req: Request) {
  try {
    const supabaseServer = await createServerClient();
    const {
      data: { user },
    } = await supabaseServer.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Rate limit push dispatch per user (max 30 push dispatches per minute)
    const rate = checkRateLimit(`send_push:${user.id}`, 30, 60_000);
    if (!rate.allowed) {
      return NextResponse.json(
        { error: "Too many push requests. Please slow down." },
        { status: 429, headers: { "Retry-After": String(rate.retryAfterSeconds) } }
      );
    }

    const rawBody = await req.json();
    const parsed = sendPushSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid notification payload" },
        { status: 400 }
      );
    }

    const {
      targetUserIds,
      title,
      body: msgBody,
      url,
      eventId,
      postId,
      type: customType,
    } = parsed.data;

    const notifType = customType || (eventId ? "event_chat" : "direct_message");

    const supabaseAdmin = createAdminSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Check caller is not banned
    const { data: callerProfile } = await supabaseAdmin
      .from("profiles")
      .select("privacy_settings")
      .eq("id", user.id)
      .maybeSingle();

    if (callerProfile?.privacy_settings?.is_banned) {
      return NextResponse.json(
        { error: "Account suspended" },
        { status: 403 }
      );
    }

    // Verify authorization: Non-admins may only dispatch event chat notifications for events they host or attend
    let verifiedTargetIds = targetUserIds.filter((id) => id !== user.id);
    const isAdmin = await isAuthorizedAdmin(user);

    if (!isAdmin) {
      if (!eventId) {
        return NextResponse.json(
          { error: "Forbidden: Direct push requires event context or server action" },
          { status: 403 }
        );
      }

      const [eventRes, attendeesRes] = await Promise.all([
        supabaseAdmin
          .from("events")
          .select("creator_id")
          .eq("id", eventId)
          .maybeSingle(),
        supabaseAdmin
          .from("event_attendees")
          .select("user_id")
          .eq("event_id", eventId),
      ]);

      const validMembers = new Set<string>();
      if (eventRes.data?.creator_id) {
        validMembers.add(eventRes.data.creator_id);
      }
      (attendeesRes.data || []).forEach((a: any) => {
        if (a.user_id) validMembers.add(a.user_id);
      });

      if (!validMembers.has(user.id)) {
        return NextResponse.json(
          { error: "Forbidden: You are not a participant of this event" },
          { status: 403 }
        );
      }

      verifiedTargetIds = verifiedTargetIds.filter((id) =>
        validMembers.has(id)
      );
    }

    if (verifiedTargetIds.length === 0) {
      return NextResponse.json({
        success: true,
        sentCount: 0,
        note: "No eligible recipients",
      });
    }

    // 1. Insert in-app notification rows for verified recipients
    try {
      const notificationRows = verifiedTargetIds.map((targetId: string) => ({
        user_id: targetId,
        actor_id: user.id,
        type: notifType,
        event_id: eventId || null,
        post_id: postId || null,
        is_read: false,
      }));
      if (notificationRows.length > 0) {
        await supabaseAdmin.from("notifications").insert(notificationRows);
      }
    } catch (e) {
      console.error("Failed to insert in-app notification rows:", e);
    }

    // 2. Filter target users based on their granular push notification preferences
    const { data: targetProfiles } = await supabaseAdmin
      .from("profiles")
      .select("id, privacy_settings")
      .in("id", verifiedTargetIds);

    const allowedUserIds = (targetProfiles || [])
      .filter((p) => {
        if (p.id === user.id) return false;
        const pushPrefs = p.privacy_settings?.push_notifications;
        if (!pushPrefs) return true;
        if (pushPrefs.enabled === false) return false;
        if (
          (notifType === "event_chat" || notifType === "direct_message") &&
          pushPrefs.chats === false
        )
          return false;
        if (
          (notifType === "like" || notifType === "comment_like") &&
          pushPrefs.likes === false
        )
          return false;
        if (
          (notifType === "comment" || notifType === "reply") &&
          pushPrefs.comments === false
        )
          return false;
        if (notifType === "event_join" && pushPrefs.events === false)
          return false;
        return true;
      })
      .map((p) => p.id);

    if (allowedUserIds.length === 0) {
      return NextResponse.json({
        success: true,
        sentCount: 0,
        note: "All target users muted chat push alerts",
      });
    }

    // 3. Retrieve FCM push tokens from Supabase using admin client for allowed users
    const { data: tokenRows } = await supabaseAdmin
      .from("user_push_tokens")
      .select("token")
      .in("user_id", allowedUserIds);

    if (!tokenRows || tokenRows.length === 0) {
      return NextResponse.json({
        success: true,
        sentCount: 0,
        note: "No push tokens found for target users",
      });
    }

    const tokens = tokenRows.map((r) => r.token).filter(Boolean);

    const messaging = adminMessaging || getAdminMessaging();
    if (!messaging) {
      return NextResponse.json({
        success: false,
        error: "Push service is not configured",
      });
    }

    const pushTitle = (title || "New Notification").slice(0, 150);
    const pushBody = (msgBody || "").slice(0, 500);
    const destinationUrl = getSafeRedirectPath(url, "/notifications");

    const response = await messaging.sendEachForMulticast({
      tokens,
      notification: {
        title: pushTitle,
        body: pushBody,
      },
      data: {
        title: pushTitle,
        body: pushBody,
        url: destinationUrl,
        type: notifType,
      },
      webpush: {
        headers: {
          Urgency: "high",
        },
        notification: {
          title: pushTitle,
          body: pushBody,
          icon: "/icon.png",
          badge: "/icon.png",
        },
        fcmOptions: {
          link: destinationUrl,
        },
      },
      apns: {
        headers: {
          "apns-priority": "10",
        },
        payload: {
          aps: {
            alert: {
              title: pushTitle,
              body: pushBody,
            },
            sound: "default",
            badge: 1,
          },
        },
      },
    });

    // Clean up invalid/stale tokens
    if (response.failureCount > 0) {
      const staleTokens: string[] = [];
      response.responses.forEach((resp, idx) => {
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
        await supabaseAdmin
          .from("user_push_tokens")
          .delete()
          .in("token", staleTokens);
      }
    }

    return NextResponse.json({
      success: true,
      sentCount: response.successCount,
      failureCount: response.failureCount,
    });
  } catch (error: unknown) {
    console.error("Push Notification Error:", error);
    return NextResponse.json(
      { error: "Failed to dispatch notification" },
      { status: 500 }
    );
  }
}
