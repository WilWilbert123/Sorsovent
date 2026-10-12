"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { format } from "date-fns";
import {
  Users,
  CalendarDays,
  FileText,
  AlertTriangle,
  TrendingUp,
  UserCheck,
  RefreshCw,
  ExternalLink,
  Shield,
  ArrowRight,
  Layers,
  Sparkles,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { createClient } from "@/lib/supabase/client";

interface DashboardStats {
  totalUsers: number;
  totalEvents: number;
  totalPosts: number;
  pendingReports: number;
  newUsersThisWeek: number;
  activeEvents: number;
  totalAttendees: number;
}

interface AdminDashboardLiveProps {
  initialStats: DashboardStats;
  initialRecentUsers: any[];
  initialRecentEvents: any[];
}

export function AdminDashboardLive({
  initialStats,
  initialRecentUsers,
  initialRecentEvents,
}: AdminDashboardLiveProps) {
  const [stats, setStats] = useState<DashboardStats>(initialStats);
  const [recentUsers, setRecentUsers] = useState<any[]>(initialRecentUsers);
  const [recentEvents, setRecentEvents] = useState<any[]>(initialRecentEvents);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchLiveDashboard = async () => {
    setIsRefreshing(true);
    try {
      const supabase = createClient();

      const [
        { count: totalUsers },
        { count: totalEvents },
        { count: totalPosts },
        { count: pendingReports },
        { count: newUsersThisWeek },
        { count: totalAttendees },
        { data: users },
        { data: rawEvents },
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
        supabase
          .from("profiles")
          .select("id, username, full_name, avatar_url, created_at, user_roles(role)")
          .order("created_at", { ascending: false })
          .limit(5),
        supabase
          .from("events")
          .select("id, title, start_time, location_name, event_attendees(count), is_public")
          .order("created_at", { ascending: false })
          .limit(5),
      ]);

      setStats({
        totalUsers: totalUsers || 0,
        totalEvents: totalEvents || 0,
        totalPosts: totalPosts || 0,
        pendingReports: pendingReports || 0,
        newUsersThisWeek: newUsersThisWeek || 0,
        activeEvents: totalEvents || 0,
        totalAttendees: totalAttendees || 0,
      });

      if (users) setRecentUsers(users);
      if (rawEvents) {
        setRecentEvents(
          rawEvents.map((e: any) => ({
            ...e,
            attendee_count: e.event_attendees?.[0]?.count ?? 0,
          }))
        );
      }
    } catch (err) {
      console.error("Dashboard refresh error:", err);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel("admin-dashboard-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "events" }, () => fetchLiveDashboard())
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () => fetchLiveDashboard())
      .on("postgres_changes", { event: "*", schema: "public", table: "event_attendees" }, () => fetchLiveDashboard())
      .on("postgres_changes", { event: "*", schema: "public", table: "reports" }, () => fetchLiveDashboard())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div className="space-y-8">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Admin Overview</h1>
            <Badge variant="outline" className="border-emerald-500/30 text-emerald-600 bg-emerald-500/5 text-[10px] gap-1 font-mono">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live Sync
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Platform performance metrics, real-time activity stream, and management shortcuts
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={fetchLiveDashboard}
          disabled={isRefreshing}
          className="gap-1.5 text-xs h-9 self-start sm:self-auto"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
          Refresh Stats
        </Button>
      </div>

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-4">
        <Card className="rounded-xl sm:rounded-2xl border shadow-2xs hover:border-primary/40 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between p-3.5 sm:p-5 pb-1 sm:pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Total Members</CardTitle>
            <div className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-primary/10 text-primary">
              <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </div>
          </CardHeader>
          <CardContent className="p-3.5 sm:p-5 pt-0">
            <div className="text-xl sm:text-3xl font-bold">{stats.totalUsers}</div>
            <p className="text-[11px] sm:text-xs text-emerald-600 dark:text-emerald-400 mt-1 flex items-center font-medium">
              <TrendingUp className="h-3 w-3 mr-1" /> +{stats.newUsersThisWeek} joined this week
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-xl sm:rounded-2xl border shadow-2xs hover:border-primary/40 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between p-3.5 sm:p-5 pb-1 sm:pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Gatherings</CardTitle>
            <div className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-emerald-500/10 text-emerald-600">
              <CalendarDays className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </div>
          </CardHeader>
          <CardContent className="p-3.5 sm:p-5 pt-0">
            <div className="text-xl sm:text-3xl font-bold">{stats.totalEvents}</div>
            <p className="text-[11px] sm:text-xs text-muted-foreground mt-1">
              <strong className="text-foreground">{stats.totalAttendees}</strong> RSVPs recorded
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-xl sm:rounded-2xl border shadow-2xs hover:border-primary/40 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between p-3.5 sm:p-5 pb-1 sm:pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Reports Queue</CardTitle>
            <div className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-amber-500/10 text-amber-600">
              <AlertTriangle className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </div>
          </CardHeader>
          <CardContent className="p-3.5 sm:p-5 pt-0">
            <div className="text-xl sm:text-3xl font-bold text-amber-600 dark:text-amber-400">
              {stats.pendingReports}
            </div>
            <p className="text-[11px] sm:text-xs text-muted-foreground mt-1">
              {stats.pendingReports === 0 ? "All clear" : "Items awaiting review"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Action Navigation Panels */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        <Link
          href="/admin/events"
          className="p-3 sm:p-4 rounded-xl sm:rounded-2xl border bg-card hover:bg-muted/50 hover:border-primary/40 transition-all flex flex-col justify-between group shadow-2xs"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <CalendarDays className="h-4 w-4" />
            </div>
            <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:translate-x-1 transition-transform" />
          </div>
          <div>
            <p className="font-semibold text-sm">Manage Events</p>
            <p className="text-[11px] text-muted-foreground">Status, RSVPs & take-downs</p>
          </div>
        </Link>

        <Link
          href="/admin/users"
          className="p-4 rounded-2xl border bg-card hover:bg-muted/50 hover:border-primary/40 transition-all flex flex-col justify-between group shadow-sm"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <Users className="h-4 w-4" />
            </div>
            <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:translate-x-1 transition-transform" />
          </div>
          <div>
            <p className="font-semibold text-sm">Manage Users</p>
            <p className="text-[11px] text-muted-foreground">Roles, staff & suspensions</p>
          </div>
        </Link>

        <Link
          href="/admin/audit-logs"
          className="p-4 rounded-2xl border bg-card hover:bg-muted/50 hover:border-primary/40 transition-all flex flex-col justify-between group shadow-sm"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <FileText className="h-4 w-4" />
            </div>
            <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:translate-x-1 transition-transform" />
          </div>
          <div>
            <p className="font-semibold text-sm">Audit Logs</p>
            <p className="text-[11px] text-muted-foreground">Real-time actions & safe purge</p>
          </div>
        </Link>

        <Link
          href="/admin/settings"
          className="p-4 rounded-2xl border bg-card hover:bg-muted/50 hover:border-primary/40 transition-all flex flex-col justify-between group shadow-sm"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <Sparkles className="h-4 w-4" />
            </div>
            <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:translate-x-1 transition-transform" />
          </div>
          <div>
            <p className="font-semibold text-sm">Platform Settings</p>
            <p className="text-[11px] text-muted-foreground">Branding, alerts & rules</p>
          </div>
        </Link>
      </div>

      {/* Recent Activity Dual Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Events */}
        <Card className="rounded-2xl shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-base font-bold">Latest Events</CardTitle>
              <CardDescription className="text-xs">Most recently created gatherings</CardDescription>
            </div>
            <Link href="/admin/events">
              <Button variant="ghost" size="sm" className="text-xs gap-1">
                View All <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {recentEvents.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6">No events published yet.</p>
            ) : (
              <div className="space-y-3">
                {recentEvents.map((ev) => (
                  <div
                    key={ev.id}
                    className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-muted/30 border hover:bg-muted/60 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <Link href={`/events/${ev.id}`} className="font-semibold text-sm hover:text-primary transition-colors truncate block">
                        {ev.title}
                      </Link>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">
                        {ev.location_name || "Sorsogon"} • {ev.attendee_count} attending
                      </p>
                    </div>
                    <Badge variant={ev.is_public ? "outline" : "secondary"} className="text-[10px] shrink-0">
                      {ev.is_public ? "Public" : "Private"}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Registered Users */}
        <Card className="rounded-2xl shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-base font-bold">Newest Members</CardTitle>
              <CardDescription className="text-xs">Latest registrations on the platform</CardDescription>
            </div>
            <Link href="/admin/users">
              <Button variant="ghost" size="sm" className="text-xs gap-1">
                View All <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {recentUsers.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6">No registered users found.</p>
            ) : (
              <div className="space-y-3">
                {recentUsers.map((u) => {
                  let role = "USER";
                  if (Array.isArray(u.user_roles)) {
                    role = u.user_roles[0]?.role || "USER";
                  } else if (u.user_roles && typeof u.user_roles === "object") {
                    role = (u.user_roles as any).role || "USER";
                  }
                  return (
                    <div
                      key={u.id}
                      className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-muted/30 border hover:bg-muted/60 transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Avatar className="h-8 w-8 shrink-0 border">
                          <AvatarImage src={u.avatar_url || undefined} />
                          <AvatarFallback className="text-xs">
                            {(u.full_name || u.username || "U")[0]?.toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="font-semibold text-sm truncate">{u.full_name || u.username}</p>
                          <p className="text-xs text-muted-foreground truncate">@{u.username}</p>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-[10px] shrink-0 font-mono">
                        {role}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
