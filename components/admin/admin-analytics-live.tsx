"use client";

import { useState, useEffect } from "react";
import {
  BarChart3,
  TrendingUp,
  Users,
  CalendarDays,
  FileText,
  UserCheck,
  CheckCircle2,
  Clock,
  ShieldAlert,
  Sparkles,
  RefreshCw,
  Globe,
  Lock,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";

export interface AnalyticsData {
  totalUsers: number;
  newUsers7d: number;
  newUsers30d: number;
  totalEvents: number;
  publicEvents: number;
  privateEvents: number;
  upcomingEvents: number;
  pastEvents: number;
  totalAttendees: number;
  totalPosts: number;
  pendingReports: number;
  resolvedReports: number;
}

export function AdminAnalyticsLive({ initialData }: { initialData: AnalyticsData }) {
  const [data, setData] = useState<AnalyticsData>(initialData);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchLiveAnalytics = async () => {
    setIsRefreshing(true);
    try {
      const supabase = createClient();
      const now = new Date().toISOString();
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

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

      setData({
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
      });
    } catch (err) {
      console.error("Failed to refresh analytics:", err);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("admin-analytics-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () => fetchLiveAnalytics())
      .on("postgres_changes", { event: "*", schema: "public", table: "events" }, () => fetchLiveAnalytics())
      .on("postgres_changes", { event: "*", schema: "public", table: "event_attendees" }, () => fetchLiveAnalytics())
      .on("postgres_changes", { event: "*", schema: "public", table: "reports" }, () => fetchLiveAnalytics())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const avgAttendeesPerEvent =
    data.totalEvents > 0 ? (data.totalAttendees / data.totalEvents).toFixed(1) : "0.0";

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Platform Analytics</h1>
            <Badge variant="outline" className="border-emerald-500/30 text-emerald-600 bg-emerald-500/5 text-[10px] gap-1 font-mono">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live Real-Time
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Accurate, live database telemetry directly from Supabase tables
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={fetchLiveAnalytics}
          disabled={isRefreshing}
          className="gap-1.5 text-xs h-9 self-start sm:self-auto"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
          Refresh Metrics
        </Button>
      </div>

      {/* KPI Overview Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="rounded-2xl border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Registered Users</CardTitle>
            <Users className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold">{data.totalUsers}</div>
            <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1 flex items-center font-medium">
              <TrendingUp className="h-3.5 w-3.5 mr-1" /> +{data.newUsers7d} in past 7 days
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Platform Events</CardTitle>
            <CalendarDays className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold">{data.totalEvents}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {data.upcomingEvents} upcoming, {data.pastEvents} concluded
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total RSVPs Confirmed</CardTitle>
            <UserCheck className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold">{data.totalAttendees}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Avg ~{avgAttendeesPerEvent} attendees / event
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Community Posts</CardTitle>
            <FileText className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold">{data.totalPosts}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Live user feeds & discussions
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Breakdowns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Events Distribution */}
        <Card className="rounded-2xl shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-primary" />
              Event Visibility & Timing
            </CardTitle>
            <CardDescription className="text-xs">
              Breakdown of public gatherings versus private member invites
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3.5 rounded-xl border bg-muted/20">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                  <Globe className="h-3.5 w-3.5 text-emerald-600" />
                  Public Events
                </div>
                <div className="text-xl font-bold">{data.publicEvents}</div>
                <p className="text-[11px] text-muted-foreground">
                  {data.totalEvents > 0 ? Math.round((data.publicEvents / data.totalEvents) * 100) : 0}% of all events
                </p>
              </div>

              <div className="p-3.5 rounded-xl border bg-muted/20">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                  <Lock className="h-3.5 w-3.5 text-amber-600" />
                  Private Events
                </div>
                <div className="text-xl font-bold">{data.privateEvents}</div>
                <p className="text-[11px] text-muted-foreground">
                  {data.totalEvents > 0 ? Math.round((data.privateEvents / data.totalEvents) * 100) : 0}% of all events
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3.5 rounded-xl border bg-muted/20">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                  <Clock className="h-3.5 w-3.5 text-blue-600" />
                  Upcoming Events
                </div>
                <div className="text-xl font-bold">{data.upcomingEvents}</div>
                <p className="text-[11px] text-muted-foreground">Active in discovery feed</p>
              </div>

              <div className="p-3.5 rounded-xl border bg-muted/20">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                  <CheckCircle2 className="h-3.5 w-3.5 text-muted-foreground" />
                  Concluded Events
                </div>
                <div className="text-xl font-bold">{data.pastEvents}</div>
                <p className="text-[11px] text-muted-foreground">Archived gatherings</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* User Growth & Moderation */}
        <Card className="rounded-2xl shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              User Growth & Moderation Velocity
            </CardTitle>
            <CardDescription className="text-xs">
              Registration windows and resolution turnaround
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3.5 rounded-xl border bg-muted/20">
                <div className="text-xs text-muted-foreground mb-1">Past 7 Days Signups</div>
                <div className="text-xl font-bold text-emerald-600">+{data.newUsers7d}</div>
                <p className="text-[11px] text-muted-foreground">New accounts</p>
              </div>

              <div className="p-3.5 rounded-xl border bg-muted/20">
                <div className="text-xs text-muted-foreground mb-1">Past 30 Days Signups</div>
                <div className="text-xl font-bold text-emerald-600">+{data.newUsers30d}</div>
                <p className="text-[11px] text-muted-foreground">Monthly growth</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3.5 rounded-xl border bg-muted/20">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                  <ShieldAlert className="h-3.5 w-3.5 text-amber-600" />
                  Pending Reports
                </div>
                <div className="text-xl font-bold text-amber-600">{data.pendingReports}</div>
                <p className="text-[11px] text-muted-foreground">In moderation queue</p>
              </div>

              <div className="p-3.5 rounded-xl border bg-muted/20">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  Resolved Reports
                </div>
                <div className="text-xl font-bold text-emerald-600">{data.resolvedReports}</div>
                <p className="text-[11px] text-muted-foreground">Successfully addressed</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
