import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { isAuthorizedAdmin } from "@/lib/admin/auth";
import { z } from "zod";

const eventSchema = z.object({
  title: z.string().min(3).max(120),
  description: z.string().max(3000).optional(),
  start_time: z.string(),
  end_time: z.string().optional(),
  location_name: z.string().min(3).max(200),
  is_public: z.boolean().default(true),
  category: z.string().max(60).optional(),
  price: z.number().min(0).max(1_000_000).default(0),
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

    const rate = checkRateLimit(`event_create:${user.id}`, 6, 60_000);
    if (!rate.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: `Too many event creation requests. Please wait ${rate.retryAfterSeconds}s.`,
        },
        { status: 429 }
      );
    }

    const body = await request.json();
    const validation = eventSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    // Verify user is not suspended
    const { data: creatorProfile } = await supabase
      .from("profiles")
      .select("privacy_settings")
      .eq("id", user.id)
      .single();

    if (creatorProfile?.privacy_settings?.is_banned) {
      return NextResponse.json(
        {
          success: false,
          error: "Your account is currently suspended from creating events.",
        },
        { status: 403 }
      );
    }

    if (validation.data.is_public) {
      const { getSystemSettingsFromSupabase } = await import(
        "@/lib/admin/settings"
      );
      const settings = await getSystemSettingsFromSupabase();
      if (!settings.allowPublicEventCreation) {
        const isAdmin = await isAuthorizedAdmin(user);
        if (!isAdmin) {
          return NextResponse.json(
            {
              success: false,
              error:
                "Public event creation is temporarily disabled by administrators.",
            },
            { status: 403 }
          );
        }
      }
    }

    const { data: event, error } = await supabase
      .from("events")
      .insert({
        ...validation.data,
        creator_id: user.id,
        organizer_id: user.id,
      })
      .select("id")
      .single();

    if (error) {
      throw error;
    }

    if (event?.id) {
      await supabase.from("event_attendees").upsert(
        { event_id: event.id, user_id: user.id, status: "attending" },
        { onConflict: "event_id,user_id" }
      );
    }

    return NextResponse.json({ success: true, data: event }, { status: 201 });
  } catch (error: unknown) {
    console.error("[Events POST Error]:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(
      50,
      Math.max(1, parseInt(searchParams.get("limit") || "20", 10))
    );
    const category = searchParams.get("category");
    const statusParam = searchParams.get("status");

    const supabase = await createClient();

    let query = supabase
      .from("events")
      .select("*, event_attendees(count)")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (statusParam) {
      query = query.eq("status", statusParam);
    } else {
      query = query.or("status.is.null,status.neq.completed");
    }

    if (category) {
      query = query.eq("category", category);
    }

    const { data: events, error } = await query;

    if (error) throw error;

    const formatted = (events || []).map((e: any) => ({
      ...e,
      attendee_count: e.event_attendees?.[0]?.count ?? 0,
    }));

    return NextResponse.json(
      { success: true, data: formatted },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error("[Events GET Error]:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
