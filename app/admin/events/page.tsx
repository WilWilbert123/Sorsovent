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

  let { data: rawEvents, error } = await adminSupabase
    .from("events")
    .select(`
      id, title, description, category, event_date, start_time, end_time, location_name,
      visibility, status, created_at, creator_id,
      event_attendees(count),
      profiles!events_creator_id_fkey (username, full_name)
    `)
    .order("created_at", { ascending: false })
    .limit(150);

  if (error) {
    // Schema fallback if relationship naming differs
    const fallback = await adminSupabase
      .from("events")
      .select("*, event_attendees(count)")
      .order("created_at", { ascending: false })
      .limit(150);
    rawEvents = fallback.data || [];
  }

  const initialEvents = (rawEvents || []).map((e: any) => ({
    ...e,
    is_public: e.visibility !== "private",
    attendee_count: e.event_attendees?.[0]?.count ?? 0,
  }));

  return <AdminEventsManager initialEvents={initialEvents} />;
}
