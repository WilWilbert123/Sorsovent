import { createClient } from "@/lib/supabase/server";
import { Users, CalendarDays, FileText, AlertTriangle, TrendingUp, UserCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

async function StatCard({
  title,
  value,
  icon: Icon,
  description,
  trend,
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  description?: string;
  trend?: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
        {trend && (
          <p className="text-xs text-green-600 mt-1">{trend}</p>
        )}
      </CardContent>
    </Card>
  );
}

export default async function AdminDashboardPage() {
  const supabase = await createClient();

  // Fetch counts in parallel
  const [
    { count: totalUsers },
    { count: totalEvents },
    { count: totalPosts },
    { count: pendingReports },
    { count: newUsersThisWeek },
    { count: activeEvents },
  ] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("events").select("id", { count: "exact", head: true }),
    supabase.from("posts").select("id", { count: "exact", head: true }),
    supabase.from("reports").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("profiles").select("id", { count: "exact", head: true }).gte(
      "created_at",
      new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    ),
    supabase.from("events").select("id", { count: "exact", head: true }).gte(
      "end_time", new Date().toISOString()
    ),
  ]);

  // Recent users
  const { data: recentUsers } = await supabase
    .from("profiles")
    .select("id, username, full_name, avatar_url, created_at")
    .order("created_at", { ascending: false })
    .limit(5);

  // Recent events
  const { data: recentEvents } = await supabase
    .from("events")
    .select("id, title, start_time, attendee_count, is_public")
    .order("created_at", { ascending: false })
    .limit(5);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground text-sm">Welcome to the Sorsovent Admin Panel</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <StatCard
          title="Total Users"
          value={totalUsers || 0}
          icon={Users}
          description="Registered accounts"
          trend={`+${newUsersThisWeek || 0} this week`}
        />
        <StatCard
          title="Total Events"
          value={totalEvents || 0}
          icon={CalendarDays}
          description={`${activeEvents || 0} active/upcoming`}
        />
        <StatCard
          title="Total Posts"
          value={totalPosts || 0}
          icon={FileText}
          description="Community posts"
        />
        <StatCard
          title="New Users (7d)"
          value={newUsersThisWeek || 0}
          icon={UserCheck}
          description="Users who joined this week"
        />
        <StatCard
          title="Active Events"
          value={activeEvents || 0}
          icon={TrendingUp}
          description="Upcoming / ongoing events"
        />
        <StatCard
          title="Pending Reports"
          value={pendingReports || 0}
          icon={AlertTriangle}
          description="Content awaiting review"
        />
      </div>

      {/* Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Users */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentUsers?.map((u) => (
                <div key={u.id} className="flex items-center gap-3 text-sm">
                  <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                    {(u.full_name || u.username || "U")[0].toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{u.full_name || u.username}</p>
                    <p className="text-xs text-muted-foreground">@{u.username}</p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {u.created_at ? new Date(u.created_at).toLocaleDateString() : ""}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Events */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Events</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentEvents?.map((ev) => (
                <div key={ev.id} className="flex items-center gap-3 text-sm">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <CalendarDays className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{ev.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {ev.attendee_count || 0} attending
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground shrink-0">
                    {ev.start_time ? new Date(ev.start_time).toLocaleDateString() : ""}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
