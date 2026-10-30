import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient as createAdminSupabaseClient } from "@supabase/supabase-js";
import { adminMessaging, getAdminMessaging } from "@/lib/firebase/admin";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const supabaseServer = await createServerClient();
    const {
      data: { user },
    } = await supabaseServer.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { targetUserIds, title, body: msgBody, url, eventId, postId, type: customType } = body;

    if (!targetUserIds || !Array.isArray(targetUserIds) || targetUserIds.length === 0) {
      return NextResponse.json({ error: "targetUserIds array required" }, { status: 400 });
    }

    const notifType = customType || (eventId ? "event_chat" : "direct_message");

    // Initialize admin Supabase client to bypass RLS when querying target user tokens
    const supabaseAdmin = createAdminSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // 1. Insert in-app notification rows for recipients so it shows up in /notifications in real time
    try {
      const notificationRows = targetUserIds
        .filter((targetId: string) => targetId !== user.id)
        .map((targetId: string) => ({
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
      .in("id", targetUserIds);

    const allowedUserIds = (targetProfiles || [])
      .filter((p) => {
        if (p.id === user.id) return false;
        const pushPrefs = p.privacy_settings?.push_notifications;
        if (!pushPrefs) return true; // default enabled
        if (pushPrefs.enabled === false) return false;
        if ((notifType === "event_chat" || notifType === "direct_message") && pushPrefs.chats === false) return false;
        if ((notifType === "like" || notifType === "comment_like") && pushPrefs.likes === false) return false;
        if ((notifType === "comment" || notifType === "reply") && pushPrefs.comments === false) return false;
        if (notifType === "event_join" && pushPrefs.events === false) return false;
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
        error: "Firebase Admin is not configured. Please check FIREBASE_PRIVATE_KEY in .env.local",
      });
    }

    const pushTitle = title || "New Notification";
    const pushBody = msgBody || "";
    const destinationUrl = url || "/notifications";

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
        await supabaseAdmin.from("user_push_tokens").delete().in("token", staleTokens);
      }
    }

    return NextResponse.json({
      success: true,
      sentCount: response.successCount,
      failCount: response.failureCount,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to send push notification" },
      { status: 500 }
    );
  }
}
