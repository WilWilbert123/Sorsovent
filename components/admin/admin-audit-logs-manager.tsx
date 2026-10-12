"use client";

import { useState, useEffect, useTransition } from "react";
import { format } from "date-fns";
import {
  FileText,
  Trash2,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  Search,
  Filter,
  Loader2,
  Info,
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

interface AuditLogItem {
  id: string;
  actor_id?: string;
  action: string;
  target_type?: string;
  target_id?: string;
  metadata?: Record<string, any> | null;
  created_at: string;
  profiles?: {
    username: string;
    full_name: string | null;
  } | null;
}

export function AdminAuditLogsManager() {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);

  const fetchLogs = async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch("/api/admin/actions?type=audit_logs");
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setLogs(data.data);
      }
    } catch (err) {
      console.error("Error fetching logs:", err);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const handleClearLogs = async () => {
    setIsClearing(true);
    try {
      const res = await fetch("/api/admin/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "clear_audit_logs", payload: {} }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success(data.message || "Audit logs cleared safely!");
        fetchLogs();
      } else {
        toast.error(data.error || "Failed to clear logs");
      }
    } catch (err: any) {
      toast.error(err.message || "Network error");
    } finally {
      setIsClearing(false);
      setIsClearModalOpen(false);
    }
  };

  const filteredLogs = logs.filter((log) => {
    const actionMatch = log.action.toLowerCase().includes(searchQuery.toLowerCase());
    const targetMatch = log.target_type && log.target_type.toLowerCase().includes(searchQuery.toLowerCase());
    const emailMatch = log.metadata?.actor_email && log.metadata.actor_email.toLowerCase().includes(searchQuery.toLowerCase());
    return actionMatch || targetMatch || emailMatch;
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">System Audit Logs</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Real-time tracking of platform administrative events and security actions
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchLogs}
            disabled={isRefreshing}
            className="gap-1.5 text-xs h-9"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>

          {/* Safe Clear Logs Button */}
          <Button
            variant="destructive"
            size="sm"
            disabled={logs.length === 0}
            onClick={() => setIsClearModalOpen(true)}
            className="gap-1.5 text-xs h-9"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Clear Audit Logs
          </Button>

          <AlertDialog open={isClearModalOpen} onOpenChange={setIsClearModalOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Safely Clear Audit Logs?</AlertDialogTitle>
                <AlertDialogDescription className="space-y-3 pt-2">
                  <p>
                    This will purge <strong>{logs.length} logged administrative events</strong> from the audit history table.
                  </p>
                  <div className="p-3 bg-muted/60 rounded-xl text-xs text-foreground/80 border flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span>
                      <strong>Safe Operation:</strong> This only clears the administrative activity log. Your events, users, profiles, tickets, and posts will remain 100% intact and unaffected.
                    </span>
                  </div>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={isClearing}>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={(e: React.MouseEvent) => {
                    e.preventDefault();
                    handleClearLogs();
                  }}
                  disabled={isClearing}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {isClearing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Clearing...
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Confirm Clear
                    </>
                  )}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Notice Banner */}
      <div className="p-3.5 rounded-2xl bg-primary/5 border border-primary/20 flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <Info className="h-4 w-4 text-primary shrink-0" />
          <span>
            Audit records capture administrative logins, event take-downs, user privilege changes, and moderation decisions in real time.
          </span>
        </div>
        <Badge variant="outline" className="font-mono text-[10px] shrink-0 border-primary/30 text-primary">
          {logs.length} Total Records
        </Badge>
      </div>

      {/* Search Input */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Filter logs by action or email..."
          className="pl-9 h-10 text-xs sm:text-sm bg-card"
        />
      </div>

      {/* Logs Table */}
      <div className="rounded-xl sm:rounded-2xl border bg-card overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="font-semibold text-[11px] sm:text-xs py-2 px-2.5 sm:px-4">Action</TableHead>
                <TableHead className="font-semibold text-[11px] sm:text-xs py-2 px-2.5 sm:px-4">Target</TableHead>
                <TableHead className="font-semibold text-[11px] sm:text-xs py-2 px-2.5 sm:px-4 hidden sm:table-cell">Actor / Email</TableHead>
                <TableHead className="font-semibold text-[11px] sm:text-xs py-2 px-2.5 sm:px-4">Details</TableHead>
                <TableHead className="font-semibold text-[11px] sm:text-xs py-2 px-2.5 sm:px-4 text-right">Timestamp</TableHead>
              </TableRow>
            </TableHeader>
          <TableBody>
            {filteredLogs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-40 text-center">
                  <div className="flex flex-col items-center justify-center text-muted-foreground space-y-2">
                    <FileText className="h-8 w-8 opacity-30" />
                    <p className="text-sm font-medium">No audit logs found</p>
                    <p className="text-xs text-muted-foreground">Administrative activities will appear here in real time</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredLogs.map((log) => {
                const date = log.created_at ? new Date(log.created_at) : null;
                const isPurged = log.action.includes("PURGE");
                const isDelete = log.action.includes("DELETE") || log.action.includes("BAN");
                const isUpdate = log.action.includes("UPDATE") || log.action.includes("ROLE");

                return (
                  <TableRow key={log.id} className="hover:bg-muted/40 transition-colors">
                    {/* Action */}
                    <TableCell>
                      <Badge
                        variant={isDelete ? "destructive" : isPurged ? "outline" : isUpdate ? "secondary" : "default"}
                        className="text-[10px] font-mono tracking-wide"
                      >
                        {log.action}
                      </Badge>
                    </TableCell>

                    {/* Target */}
                    <TableCell className="text-xs capitalize font-medium">
                      {log.target_type || "System"}
                    </TableCell>

                    {/* Actor */}
                    <TableCell className="text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">
                        {log.metadata?.actor_email || log.profiles?.username || "Admin"}
                      </span>
                    </TableCell>

                    {/* Metadata / Details */}
                    <TableCell className="text-xs text-muted-foreground max-w-xs truncate">
                      {log.metadata?.title && <span>Event: "{log.metadata.title}"</span>}
                      {log.metadata?.targetUsername && <span>User: @{log.metadata.targetUsername} ({log.metadata.newRole || "Banned"})</span>}
                      {log.metadata?.note && <span>{log.metadata.note}</span>}
                      {!log.metadata?.title && !log.metadata?.targetUsername && !log.metadata?.note && (
                        <span>ID: {log.id.slice(0, 8)}...</span>
                      )}
                    </TableCell>

                    {/* Timestamp */}
                    <TableCell className="text-xs text-muted-foreground text-right whitespace-nowrap">
                      {date ? format(date, "MMM d, yyyy • h:mm:ss a") : "—"}
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
