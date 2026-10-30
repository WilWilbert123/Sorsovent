import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { z } from "zod";

const notificationSchema = z.object({
  recipient_id: z.string().uuid(),
  type: z
    .enum([
      "like",
      "comment",
      "comment_like",
      "reply",
      "follow",
      "event_join",
      "event_chat",
      "direct_message",
    ]),
  content: z.string().min(1).max(300).optional(),
  reference_id: z.string().uuid().optional(),
});

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const rate = checkRateLimit(`notif_create:${user.id}`, 30, 60_000);
    if (!rate.allowed) {
      return NextResponse.json(
        { success: false, error: "Too many requests" },
        { status: 429 }
      );
    }

    const body = await request.json();
    const validation = notificationSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    if (validation.data.recipient_id === user.id) {
      return NextResponse.json(
        { success: false, error: "Cannot notify self" },
        { status: 400 }
      );
    }

    // Strictly bind actor_id to the authenticated caller so actor spoofing is impossible
    const { data: notification, error } = await supabase
      .from("notifications")
      .insert({
        user_id: validation.data.recipient_id,
        recipient_id: validation.data.recipient_id,
        actor_id: user.id,
        type: validation.data.type,
        message: validation.data.content || null,
        is_read: false,
      })
      .select("id")
      .single();

    if (error) throw error;

    return NextResponse.json(
      { success: true, data: notification },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error("[Notifications POST Error]:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { data: notifications, error } = await supabase
      .from("notifications")
      .select("*")
      .or(`user_id.eq.${user.id},recipient_id.eq.${user.id}`)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) throw error;

    return NextResponse.json(
      { success: true, data: notifications },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error("[Notifications GET Error]:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
