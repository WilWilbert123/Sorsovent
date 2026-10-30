import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AdminDashboardLive } from "@/components/admin/admin-dashboard-live";

export default async function AdminDashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/admin/mingle/login");

  // Fetch initial aggregate counts for fast SSR
  const [
    { count: totalUsers },
    { count: totalEvents },
    { count: totalPosts },
    { count: pendingReports },
  ] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("events").select("id", { count: "exact", head: true }),
    supabase.from("posts").select("id", { count: "exact", head: true }),
    supabase.from("reports").select("id", { count: "exact", head: true }).eq("status", "pending"),
  ]);

  // Fetch latest members
  const { data: recentUsers } = await supabase
    .from("profiles")
    .select("id, username, full_name, avatar_url, created_at, user_roles(role)")
    .order("created_at", { ascending: false })
    .limit(5);

  // Fetch recent events with attendees count
  const { data: rawRecentEvents } = await supabase
    .from("events")
    .select("*, event_attendees(count)")
    .order("created_at", { ascending: false })
    .limit(5);

  const recentEvents = (rawRecentEvents || []).map((ev: any) => ({
    id: ev.id,
    title: ev.title || "Untitled",
    location_name: ev.location_name || "",
    is_public: ev.visibility ? ev.visibility !== "private" : Boolean(ev.is_public ?? true),
    attendee_count: ev.event_attendees?.[0]?.count ?? 0,
  }));

  const initialStats = {
    totalUsers: totalUsers || 0,
    totalEvents: totalEvents || 0,
    totalPosts: totalPosts || 0,
    pendingReports: pendingReports || 0,
    newUsersThisWeek: 0,
    activeEvents: totalEvents || 0,
    totalAttendees: 0,
  };

  return (
    <AdminDashboardLive
      initialStats={initialStats}
      initialRecentUsers={recentUsers || []}
      initialRecentEvents={recentEvents}
    />
  );
}
