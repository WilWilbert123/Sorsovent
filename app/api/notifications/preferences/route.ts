import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { z } from "zod";

function getAdminSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createAdminClient(url, key);
}

export interface PushNotificationPreferences {
  enabled: boolean;
  likes: boolean;
  comments: boolean;
  chats: boolean;
  events: boolean;
}

const defaultPreferences: PushNotificationPreferences = {
  enabled: true,
  likes: true,
  comments: true,
  chats: true,
  events: true,
};

const updateSchema = z.object({
  enabled: z.boolean().optional(),
  likes: z.boolean().optional(),
  comments: z.boolean().optional(),
  chats: z.boolean().optional(),
  events: z.boolean().optional(),
});

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = getAdminSupabase();
    const { data: profile } = await admin
      .from("profiles")
      .select("privacy_settings")
      .eq("id", user.id)
      .maybeSingle();

    const stored = profile?.privacy_settings?.push_notifications;
    const preferences: PushNotificationPreferences = {
      ...defaultPreferences,
      ...(stored || {}),
    };

    return NextResponse.json({ success: true, preferences });
  } catch (error: any) {
    console.error("GET preferences error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to load preferences" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const validation = updateSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: "Invalid preferences format" },
        { status: 400 }
      );
    }

    const admin = getAdminSupabase();

    // Fetch existing settings
    const { data: profile } = await admin
      .from("profiles")
      .select("privacy_settings")
      .eq("id", user.id)
      .maybeSingle();

    const currentPrivacy = profile?.privacy_settings || { profile_visibility: "public" };
    const currentPushPrefs = currentPrivacy.push_notifications || defaultPreferences;

    // Merge updates
    const updatedPushPrefs: PushNotificationPreferences = {
      ...currentPushPrefs,
      ...validation.data,
    };

    const updatedPrivacy = {
      ...currentPrivacy,
      push_notifications: updatedPushPrefs,
    };

    const { error: updateError } = await admin
      .from("profiles")
      .update({
        privacy_settings: updatedPrivacy,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({
      success: true,
      preferences: updatedPushPrefs,
      message: "Push notification preferences saved.",
    });
  } catch (error: any) {
    console.error("POST preferences error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update preferences" },
      { status: 500 }
    );
  }
}
