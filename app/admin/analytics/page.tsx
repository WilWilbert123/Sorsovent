import { createClient } from "@/lib/supabase/server";
import { AdminAnalyticsLive, AnalyticsData } from "@/components/admin/admin-analytics-live";

export default async function AdminAnalyticsPage() {
  const supabase = await createClient();
  const now = new Date().toISOString();
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  // Parallel server fetches for 100% accurate database telemetry
  const [
    { count: totalUsers },
    { count: newUsers7d },
    { count: newUsers30d },
    { count: totalEvents },
    { count: publicEvents },
    { count: privateEvents },
    { count: upcomingEvents },
    { count: totalAttendees },
    { count: totalPosts },
    { count: pendingReports },
    { count: resolvedReports },
  ] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", sevenDaysAgo),
    supabase.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", thirtyDaysAgo),
    supabase.from("events").select("id", { count: "exact", head: true }),
    supabase.from("events").select("id", { count: "exact", head: true }).eq("is_public", true),
    supabase.from("events").select("id", { count: "exact", head: true }).eq("is_public", false),
    supabase.from("events").select("id", { count: "exact", head: true }).gte("start_time", now),
    supabase.from("event_attendees").select("id", { count: "exact", head: true }),
    supabase.from("posts").select("id", { count: "exact", head: true }),
    supabase.from("reports").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("reports").select("id", { count: "exact", head: true }).neq("status", "pending"),
  ]);

  const totEv = totalEvents || 0;
  const upEv = upcomingEvents || 0;
  const pastEv = Math.max(0, totEv - upEv);

  const initialData: AnalyticsData = {
    totalUsers: totalUsers || 0,
    newUsers7d: newUsers7d || 0,
    newUsers30d: newUsers30d || 0,
    totalEvents: totEv,
    publicEvents: publicEvents || 0,
    privateEvents: privateEvents || 0,
    upcomingEvents: upEv,
    pastEvents: pastEv,
    totalAttendees: totalAttendees || 0,
    totalPosts: totalPosts || 0,
    pendingReports: pendingReports || 0,
    resolvedReports: resolvedReports || 0,
  };

  return <AdminAnalyticsLive initialData={initialData} />;
}
