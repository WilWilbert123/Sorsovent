import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { AdminEventsManager } from "@/components/admin/admin-events-manager";

function getServiceRoleSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createAdminClient(url, key);
}

export const dynamic = "force-dynamic";

export default async function AdminEventsPage() {
  const adminSupabase = getServiceRoleSupabase();
  let rawEvents: any[] = [];

  try {
    const { data, error } = await adminSupabase
      .from("events")
      .select("*, event_attendees(count)")
      .order("created_at", { ascending: false })
      .limit(150);

    if (error) {
      console.error("Error querying events for admin:", error);
    }

    if (data && data.length > 0) {
      const creatorIds = Array.from(
        new Set(data.map((e: any) => e.creator_id || e.organizer_id).filter(Boolean))
      );

      let profileMap = new Map<string, any>();
      if (creatorIds.length > 0) {
        const { data: profiles } = await adminSupabase
          .from("profiles")
          .select("id, username, full_name, avatar_url")
          .in("id", creatorIds);

        if (profiles) {
          profileMap = new Map(profiles.map((p: any) => [p.id, p]));
        }
      }

      rawEvents = data.map((e: any) => ({
        ...e,
        profiles: profileMap.get(e.creator_id || e.organizer_id) || null,
      }));
    }
  } catch (err) {
    console.error("Fatal error loading admin events:", err);
  }

  const initialEvents = rawEvents.map((e: any) => ({
    id: e.id,
    title: e.title || "Untitled Event",
    description: e.description || "",
    category: e.category || "General",
    event_date: e.event_date || "",
    start_time: e.start_time || "",
    end_time: e.end_time || "",
    location_name: e.location_name || "",
    visibility: e.visibility || (e.is_public === false ? "private" : "public"),
    is_public: e.visibility ? e.visibility !== "private" : Boolean(e.is_public ?? true),
    status: e.status || "published",
    attendee_count: e.event_attendees?.[0]?.count ?? 0,
    created_at: e.created_at || new Date().toISOString(),
    creator_id: e.creator_id || e.organizer_id || "",
    profiles: e.profiles
      ? {
          username: e.profiles.username || "user",
          full_name: e.profiles.full_name || e.profiles.username || "User",
        }
      : null,
  }));

  return <AdminEventsManager initialEvents={initialEvents} />;
}
