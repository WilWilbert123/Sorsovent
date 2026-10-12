"use client";

import { useState, useEffect, useMemo, useTransition } from "react";
import { format } from "date-fns";
import {
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  Search,
  ShieldAlert,
  User,
  CalendarDays,
  FileText,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

interface ReportItem {
  id: string;
  reporter_id?: string;
  reported_user_id?: string;
  reported_post_id?: string;
  reported_event_id?: string;
  reason: string;
  details?: string;
  status: string;
  created_at: string;
}

interface AdminReportsManagerProps {
  initialReports: ReportItem[];
}

export function AdminReportsManager({ initialReports }: AdminReportsManagerProps) {
  const [reports, setReports] = useState<ReportItem[]>(initialReports);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setReports(initialReports);
  }, [initialReports]);

  const fetchLiveReports = async () => {
    setIsRefreshing(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("reports")
        .select("*")
        .order("created_at", { ascending: false });

      if (!error && data) {
        setReports(data);
      }
    } catch (err) {
      console.error("Error refreshing reports:", err);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("admin-realtime-reports")
      .on("postgres_changes", { event: "*", schema: "public", table: "reports" }, () => {
        fetchLiveReports();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const targetPendingCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    reports.forEach((r) => {
      const tid = r.reported_event_id || r.reported_post_id || r.reported_user_id;
      if (tid && (r.status === "pending" || !r.status)) {
        counts[tid] = (counts[tid] || 0) + 1;
      }
    });
    return counts;
  }, [reports]);

  const filteredReports = useMemo(() => {
    return reports.filter((r) => {
      const matchesSearch =
        r.reason.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (r.details && r.details.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesStatus = statusFilter === "all" || r.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [reports, searchQuery, statusFilter]);

  const handleUpdateReportStatus = async (reportId: string, newStatus: "resolved" | "dismissed", reason: string) => {
    startTransition(async () => {
      try {
        const res = await fetch("/api/admin/actions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "resolve_report",
            payload: { reportId, status: newStatus, reason },
          }),
        });

        const data = await res.json();
        if (data.success) {
          toast.success(data.message || `Report marked as ${newStatus}`);
          setReports((prev) =>
            prev.map((r) => (r.id === reportId ? { ...r, status: newStatus } : r))
          );
        } else {
          toast.error(data.error || "Failed to update report");
        }
      } catch (err: any) {
        toast.error(err.message || "Network error");
      }
    });
  };

  const pendingCount = reports.filter((r) => r.status === "pending" || !r.status).length;
  const resolvedCount = reports.filter((r) => r.status === "resolved").length;
  const dismissedCount = reports.filter((r) => r.status === "dismissed").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Reports & Moderation</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Real-time flagged content review, resolution queue, and safety controls
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchLiveReports}
          disabled={isRefreshing}
          className="gap-1.5 text-xs h-9 self-start sm:self-auto"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-card border rounded-2xl p-4 shadow-sm">
          <p className="text-xs font-medium text-muted-foreground">Pending Review</p>
          <p className="text-xl sm:text-2xl font-bold mt-1 text-amber-600 dark:text-amber-400">{pendingCount}</p>
        </div>
        <div className="bg-card border rounded-2xl p-4 shadow-sm">
          <p className="text-xs font-medium text-muted-foreground">Resolved</p>
          <p className="text-xl sm:text-2xl font-bold mt-1 text-emerald-600 dark:text-emerald-400">{resolvedCount}</p>
        </div>
        <div className="bg-card border rounded-2xl p-4 shadow-sm">
          <p className="text-xs font-medium text-muted-foreground">Dismissed</p>
          <p className="text-xl sm:text-2xl font-bold mt-1 text-muted-foreground">{dismissedCount}</p>
        </div>
        <div className="bg-card border rounded-2xl p-4 shadow-sm">
          <p className="text-xs font-medium text-muted-foreground">Total Reports</p>
          <p className="text-xl sm:text-2xl font-bold mt-1 text-foreground">{reports.length}</p>
        </div>
      </div>

      {/* Search & Tabs */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search reports by reason or details..."
            className="pl-9 h-10 text-xs sm:text-sm bg-card"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 no-scrollbar">
          {[
            { id: "all", label: "All" },
            { id: "pending", label: `Pending (${pendingCount})` },
            { id: "resolved", label: "Resolved" },
            { id: "dismissed", label: "Dismissed" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                statusFilter === tab.id
                  ? "bg-primary text-primary-foreground font-semibold shadow-sm"
                  : "bg-card border text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Reports Table */}
      <div className="rounded-xl sm:rounded-2xl border bg-card overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="font-semibold text-[11px] sm:text-xs py-2 px-2.5 sm:px-4">Target Type</TableHead>
                <TableHead className="font-semibold text-[11px] sm:text-xs py-2 px-2.5 sm:px-4">Reason & Details</TableHead>
                <TableHead className="font-semibold text-[11px] sm:text-xs py-2 px-2 sm:px-4">Status</TableHead>
                <TableHead className="font-semibold text-[11px] sm:text-xs py-2 px-2.5 sm:px-4 hidden sm:table-cell">Reported Date</TableHead>
                <TableHead className="text-right font-semibold text-[11px] sm:text-xs py-2 px-2.5 sm:px-4">Actions</TableHead>
              </TableRow>
            </TableHeader>
          <TableBody>
            {filteredReports.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-44 text-center">
                  <div className="flex flex-col items-center justify-center text-muted-foreground space-y-2">
                    <CheckCircle2 className="h-8 w-8 text-emerald-500/50" />
                    <p className="text-sm font-medium">All caught up!</p>
                    <p className="text-xs text-muted-foreground">No pending content reports to moderate.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredReports.map((report) => {
                const isPendingState = report.status === "pending" || !report.status;
                const date = report.created_at ? new Date(report.created_at) : null;
                const targetType = report.reported_event_id
                  ? "Event"
                  : report.reported_post_id
                  ? "Post"
                  : report.reported_user_id
                  ? "User"
                  : "General";

                const targetId = report.reported_event_id || report.reported_post_id || report.reported_user_id;
                const totalTargetComplaints = targetId ? (targetPendingCounts[targetId] || 1) : 1;

                return (
                  <TableRow key={report.id} className="hover:bg-muted/40 transition-colors">
                    {/* Target Type */}
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {targetType === "Event" ? (
                          <CalendarDays className="h-4 w-4 text-primary" />
                        ) : targetType === "Post" ? (
                          <FileText className="h-4 w-4 text-emerald-600" />
                        ) : (
                          <User className="h-4 w-4 text-amber-600" />
                        )}
                        <span className="font-medium text-xs">{targetType}</span>
                      </div>
                    </TableCell>

                    {/* Reason */}
                    <TableCell>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-sm">{report.reason}</p>
                          {totalTargetComplaints >= 5 && isPendingState && (
                            <Badge variant="destructive" className="text-[10px] gap-1 px-1.5 py-0 animate-pulse font-mono">
                              🚨 Urgent ({totalTargetComplaints} reports)
                            </Badge>
                          )}
                        </div>
                        {report.details && (
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{report.details}</p>
                        )}
                      </div>
                    </TableCell>

                    {/* Status */}
                    <TableCell>
                      {report.status === "resolved" ? (
                        <Badge variant="outline" className="text-[10px] gap-1 border-emerald-500/40 text-emerald-600">
                          <CheckCircle2 className="h-2.5 w-2.5" /> Resolved
                        </Badge>
                      ) : report.status === "dismissed" ? (
                        <Badge variant="secondary" className="text-[10px] gap-1">
                          <XCircle className="h-2.5 w-2.5" /> Dismissed
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] gap-1 border-amber-500/40 text-amber-600 bg-amber-500/5">
                          <Clock className="h-2.5 w-2.5" /> Pending
                        </Badge>
                      )}
                    </TableCell>

                    {/* Date */}
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {date ? format(date, "MMM d, yyyy • h:mm a") : "—"}
                    </TableCell>

                    {/* Actions */}
                    <TableCell className="text-right">
                      {isPendingState ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="default"
                            size="sm"
                            disabled={isPending}
                            onClick={() => handleUpdateReportStatus(report.id, "resolved", report.reason)}
                            className="text-xs h-8 bg-emerald-600 hover:bg-emerald-700 text-white"
                          >
                            Resolve
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={isPending}
                            onClick={() => handleUpdateReportStatus(report.id, "dismissed", report.reason)}
                            className="text-xs h-8 text-muted-foreground"
                          >
                            Dismiss
                          </Button>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground font-medium">Completed</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
        </div>
      </div>
    </div>
  );
}
