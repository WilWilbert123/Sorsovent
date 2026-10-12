import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const eventSchema = z.object({
  title: z.string().min(3).max(100),
  description: z.string().optional(),
  start_time: z.string(),
  end_time: z.string().optional(),
  location_name: z.string().min(3),
  is_public: z.boolean().default(true),
  category: z.string().optional(),
  price: z.number().default(0),
});

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
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
        { success: false, error: "Your account is currently suspended from creating events." },
        { status: 403 }
      );
    }

    if (validation.data.is_public) {
      const { getSystemSettings } = await import("@/lib/admin/settings");
      const settings = getSystemSettings();
      if (!settings.allowPublicEventCreation) {
        const isSuperAdmin = user.email?.toLowerCase() === "johnwilbertgamis2022@gmail.com";
        if (!isSuperAdmin) {
          return NextResponse.json(
            { success: false, error: "Public event creation is temporarily disabled by administrators." },
            { status: 403 }
          );
        }
      }
    }

    const { data: event, error } = await supabase
      .from("events")
      .insert({
        ...validation.data,
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
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "20");
    const category = searchParams.get("category");
    
    const supabase = await createClient();
    
    let query = supabase
      .from("events")
      .select("*, event_attendees(count)")
      .order("created_at", { ascending: false })
      .limit(limit);
      
    if (category) {
      query = query.eq("category", category);
    }

    const { data: events, error } = await query;

    if (error) throw error;

    const formatted = (events || []).map((e: any) => ({
      ...e,
      attendee_count: e.event_attendees?.[0]?.count ?? 0,
    }));

    return NextResponse.json({ success: true, data: formatted }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
