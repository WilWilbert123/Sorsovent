import { createClient } from "@/lib/supabase/server";
import { AdminEventsManager } from "@/components/admin/admin-events-manager";

export default async function AdminEventsPage() {
  const supabase = await createClient();

  const { data: rawEvents } = await supabase
    .from("events")
    .select(`
      id, title, description, category, start_time, end_time, location_name,
      is_public, status, created_at, creator_id,
      event_attendees(count),
      profiles!events_creator_id_fkey (username, full_name)
    `)
    .order("created_at", { ascending: false })
    .limit(100);

  const initialEvents = (rawEvents || []).map((e: any) => ({
    ...e,
    attendee_count: e.event_attendees?.[0]?.count ?? 0,
  }));

  return <AdminEventsManager initialEvents={initialEvents} />;
}

