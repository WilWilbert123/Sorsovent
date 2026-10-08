import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient as createAdminSupabaseClient } from "@supabase/supabase-js";
import { adminMessaging } from "@/lib/firebase/admin";

export async function POST(req: Request) {
  try {
    const supabaseServer = await createServerClient();
    const { data: { user } } = await supabaseServer.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { targetUserIds, title, body: msgBody, url, eventId } = body;

    if (!targetUserIds || !Array.isArray(targetUserIds) || targetUserIds.length === 0) {
      return NextResponse.json({ error: "targetUserIds array required" }, { status: 400 });
    }

    // Initialize admin Supabase client to bypass RLS when querying target user tokens
    const supabaseAdmin = createAdminSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // 1. Insert in-app notification rows for recipients so it shows up in /notifications
    try {
      const notificationRows = targetUserIds.map((targetId: string) => ({
        user_id: targetId,
        actor_id: user.id,
        type: "event_chat",
        event_id: eventId || null,
        is_read: false,
      }));
      await supabaseAdmin.from("notifications").insert(notificationRows);
    } catch (e) {
      console.error("Failed to insert in-app notification rows:", e);
    }

    // 2. Retrieve FCM push tokens from Supabase using admin client
    const { data: tokenRows } = await supabaseAdmin
      .from("user_push_tokens")
      .select("token")
      .in("user_id", targetUserIds);

    if (!tokenRows || tokenRows.length === 0) {
      return NextResponse.json({ success: true, sentCount: 0, note: "No push tokens found for target users" });
    }

    const tokens = tokenRows.map((r) => r.token).filter(Boolean);

    if (!adminMessaging) {
      return NextResponse.json({
        success: false,
        error: "Firebase Admin is not configured. Please check FIREBASE_PRIVATE_KEY in .env.local",
      });
    }

    const response = await adminMessaging.sendEachForMulticast({
      tokens,
      notification: {
        title: title || "New Notification",
        body: msgBody || "",
      },
      data: {
        url: url || "/notifications",
      },
    });

    return NextResponse.json({
      success: true,
      sentCount: response.successCount,
      failCount: response.failureCount,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Failed to send push notification" }, { status: 500 });
  }
}
