import { createClient } from "@/lib/supabase/server";
import { AdminDashboardLive } from "@/components/admin/admin-dashboard-live";

export default async function AdminDashboardPage() {
  const supabase = await createClient();

  // Fetch accurate counts in parallel
  const [
    { count: totalUsers },
    { count: totalEvents },
    { count: totalPosts },
    { count: pendingReports },
    { count: newUsersThisWeek },
    { count: totalAttendees },
  ] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("events").select("id", { count: "exact", head: true }),
    supabase.from("posts").select("id", { count: "exact", head: true }),
    supabase.from("reports").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("profiles").select("id", { count: "exact", head: true }).gte(
      "created_at",
      new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    ),
    supabase.from("event_attendees").select("id", { count: "exact", head: true }),
  ]);

  // Fetch recent profiles with user_roles
  const { data: rawUsers } = await supabase
    .from("profiles")
    .select("id, username, full_name, avatar_url, created_at, user_roles(role)")
    .order("created_at", { ascending: false })
    .limit(5);

  // Fetch recent events with attendees count
  const { data: rawRecentEvents } = await supabase
    .from("events")
    .select("id, title, start_time, location_name, event_attendees(count), is_public")
    .order("created_at", { ascending: false })
    .limit(5);

  const recentEvents = (rawRecentEvents || []).map((ev: any) => ({
    ...ev,
    attendee_count: ev.event_attendees?.[0]?.count ?? 0,
  }));

  const initialStats = {
    totalUsers: totalUsers || 0,
    totalEvents: totalEvents || 0,
    totalPosts: totalPosts || 0,
    pendingReports: pendingReports || 0,
    newUsersThisWeek: newUsersThisWeek || 0,
    activeEvents: totalEvents || 0,
    totalAttendees: totalAttendees || 0,
  };

  return (
    <AdminDashboardLive
      initialStats={initialStats}
      initialRecentUsers={rawUsers || []}
      initialRecentEvents={recentEvents}
    />
  );
}
