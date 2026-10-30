"use client";

import { useState, useEffect, useMemo, useTransition } from "react";
import {
  Database,
  RefreshCw,
  Trash2,
  Lock,
  CheckCircle2,
  AlertTriangle,
  HardDrive,
  Layers,
  Search,
  ShieldCheck,
  Loader2,
  Sparkles,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

export interface DatabaseTableInfo {
  name: string;
  label: string;
  category: string;
  safeToClear: boolean;
  desc: string;
  rowCount: number;
  estimatedBytes: number;
  exists: boolean;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function AdminDatabaseTablesMonitor() {
  const [tables, setTables] = useState<DatabaseTableInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [tableToClear, setTableToClear] = useState<DatabaseTableInfo | null>(null);
  const [isClearing, setIsClearing] = useState(false);
  const [isPending, startTransition] = useTransition();

  const fetchTables = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);

    try {
      const res = await fetch("/api/admin/actions?type=database_tables");
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setTables(json.data);
      } else {
        toast.error("Failed to load database tables info");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to query database tables");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTables();
  }, []);

  const totalRows = useMemo(() => {
    return tables.reduce((acc, curr) => acc + (curr.rowCount || 0), 0);
  }, [tables]);

  const totalStorageBytes = useMemo(() => {
    return tables.reduce((acc, curr) => acc + (curr.estimatedBytes || 0), 0);
  }, [tables]);

  const reclaimableBytes = useMemo(() => {
    return tables
      .filter((t) => t.safeToClear)
      .reduce((acc, curr) => acc + (curr.estimatedBytes || 0), 0);
  }, [tables]);

  const categories = useMemo(() => {
    const set = new Set(tables.map((t) => t.category));
    return ["all", ...Array.from(set)];
  }, [tables]);

  const filteredTables = useMemo(() => {
    return tables.filter((t) => {
      const matchesSearch =
        t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.desc.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory =
        selectedCategory === "all" || t.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [tables, searchQuery, selectedCategory]);

  const handleConfirmClear = async () => {
    if (!tableToClear) return;
    setIsClearing(true);

    try {
      const res = await fetch("/api/admin/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "clear_table",
          payload: { tableName: tableToClear.name },
        }),
      });

      const json = await res.json();
      if (json.success) {
        toast.success(
          json.message ||
            `Table "${tableToClear.name}" cleared successfully! Reclaimed storage space.`
        );
        // Refresh tables immediately
        await fetchTables(true);
      } else {
        toast.error(json.error || "Failed to clear table");
      }
    } catch (err: any) {
      toast.error(err.message || "Network error while clearing table");
    } finally {
      setIsClearing(false);
      setTableToClear(null);
    }
  };

  return (
    <Card className="rounded-2xl shadow-sm border border-border/80 overflow-hidden">
      <CardHeader className="bg-muted/20 border-b pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Database className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                Supabase Database Tables &amp; Storage Monitor
              </CardTitle>
              <Badge
                variant="outline"
                className="text-[10px] font-mono border-emerald-500/30 text-emerald-600 bg-emerald-500/5 gap-1"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Real-time Space
              </Badge>
            </div>
            <CardDescription className="text-xs">
              Monitor Supabase schema table footprints, total row counts, and safely clear disposable log tables
            </CardDescription>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fetchTables(true)}
            disabled={refreshing || loading}
            className="gap-1.5 text-xs h-8 sm:h-9 self-start sm:self-auto cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
            <span>{refreshing ? "Refreshing..." : "Refresh Space"}</span>
          </Button>
        </div>

        {/* Storage KPI Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-3">
          <div className="p-3 rounded-xl bg-card border shadow-2xs">
            <div className="flex items-center gap-1.5 text-muted-foreground text-[11px] font-medium">
              <Layers className="h-3.5 w-3.5" />
              <span>Tracked Tables</span>
            </div>
            <p className="text-lg sm:text-xl font-bold mt-1 text-foreground">
              {tables.length} <span className="text-xs font-normal text-muted-foreground">tables</span>
            </p>
          </div>

          <div className="p-3 rounded-xl bg-card border shadow-2xs">
            <div className="flex items-center gap-1.5 text-muted-foreground text-[11px] font-medium">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
              <span>Total DB Rows</span>
            </div>
            <p className="text-lg sm:text-xl font-bold mt-1 text-foreground">
              {totalRows.toLocaleString()}{" "}
              <span className="text-xs font-normal text-muted-foreground">rows</span>
            </p>
          </div>

          <div className="p-3 rounded-xl bg-card border shadow-2xs">
            <div className="flex items-center gap-1.5 text-muted-foreground text-[11px] font-medium">
              <HardDrive className="h-3.5 w-3.5 text-primary" />
              <span>Est. Disk Footprint</span>
            </div>
            <p className="text-lg sm:text-xl font-bold mt-1 text-primary">
              {formatBytes(totalStorageBytes)}
            </p>
          </div>

          <div className="p-3 rounded-xl bg-card border shadow-2xs">
            <div className="flex items-center gap-1.5 text-muted-foreground text-[11px] font-medium">
              <Trash2 className="h-3.5 w-3.5 text-amber-500" />
              <span>Purgeable Space</span>
            </div>
            <p className="text-lg sm:text-xl font-bold mt-1 text-amber-600 dark:text-amber-400">
              {formatBytes(reclaimableBytes)}
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 sm:p-6 space-y-4">
        {/* Controls: Search and Category Pills */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search table by name or purpose..."
              className="pl-8 h-8 sm:h-9 text-xs bg-card rounded-xl"
            />
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium capitalize transition-colors cursor-pointer ${
                  selectedCategory === cat
                    ? "bg-primary text-primary-foreground font-semibold shadow-2xs"
                    : "bg-muted/60 text-muted-foreground hover:bg-muted"
                }`}
              >
                {cat === "all" ? "All Tables" : cat}
              </button>
            ))}
          </div>
        </div>

        {/* Tables Grid / List */}
        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <p className="text-xs font-medium">Measuring Supabase storage footprints...</p>
          </div>
        ) : filteredTables.length === 0 ? (
          <div className="py-8 text-center text-xs text-muted-foreground border rounded-xl border-dashed">
            No database tables match your filter.
          </div>
        ) : (
          <div className="space-y-2.5">
            {filteredTables.map((tbl) => (
              <div
                key={tbl.name}
                className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-xl border bg-card/60 hover:bg-card hover:border-border transition-colors gap-3"
              >
                {/* Left: Table Identity */}
                <div className="flex items-start sm:items-center gap-3 min-w-0">
                  <div
                    className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${
                      tbl.safeToClear
                        ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                        : "bg-primary/10 text-primary"
                    }`}
                  >
                    <Database className="h-4 w-4" />
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-bold text-xs sm:text-sm text-foreground">
                        public.{tbl.name}
                      </span>
                      <Badge
                        variant="secondary"
                        className="text-[10px] px-2 py-0 font-medium rounded-md"
                      >
                        {tbl.category}
                      </Badge>
                      {tbl.safeToClear ? (
                        <Badge className="text-[10px] px-1.5 py-0 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                          Safe to clear
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="text-[10px] px-1.5 py-0 text-muted-foreground gap-1 border-muted-foreground/30"
                        >
                          <Lock className="h-2.5 w-2.5" />
                          Protected Core Table
                        </Badge>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                      {tbl.desc}
                    </p>
                  </div>
                </div>

                {/* Right: Metrics & Actions */}
                <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0">
                  <div className="text-left sm:text-right">
                    <p className="text-xs sm:text-sm font-bold text-foreground">
                      {tbl.rowCount.toLocaleString()} rows
                    </p>
                    <p className="text-[10px] font-mono text-muted-foreground">
                      ~{formatBytes(tbl.estimatedBytes)}
                    </p>
                  </div>

                  {tbl.safeToClear ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setTableToClear(tbl)}
                      disabled={tbl.rowCount === 0}
                      className="h-8 px-2.5 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/30 gap-1.5 cursor-pointer"
                      title={tbl.rowCount === 0 ? "Table is already empty" : "Purge table to free storage"}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>Clear Table</span>
                    </Button>
                  ) : (
                    <div
                      className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground/60 px-2.5 py-1 rounded-md bg-muted/30"
                      title="Core table cannot be cleared to protect system integrity"
                    >
                      <ShieldCheck className="h-3.5 w-3.5" />
                      <span>Guarded</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Security / Safety Explanation Note */}
        <div className="p-3.5 rounded-xl bg-amber-500/5 border border-amber-500/20 flex items-start gap-2.5 text-xs text-amber-700 dark:text-amber-400">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong>Database Protection Rules:</strong> Core system tables (including{" "}
            <code>profiles</code>, <code>events</code>, <code>posts</code>, and{" "}
            <code>user_roles</code>) are strictly guarded and cannot be cleared. Only transient logs
            and temporary records (such as <code>audit_logs</code>, <code>notifications</code>, and{" "}
            <code>reports</code>) can be purged to reclaim database capacity.
          </p>
        </div>
      </CardContent>

      {/* Double Confirmation Dialog */}
      <AlertDialog open={Boolean(tableToClear)} onOpenChange={(open) => !open && setTableToClear(null)}>
        <AlertDialogContent className="rounded-2xl max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Purge Table: public.{tableToClear?.name}?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs space-y-2 leading-relaxed">
              <span>
                You are about to purge all{" "}
                <strong>{tableToClear?.rowCount.toLocaleString()} rows</strong> from{" "}
                <code className="px-1.5 py-0.5 bg-muted rounded font-mono font-bold text-foreground">
                  public.{tableToClear?.name}
                </code>
                .
              </span>
              <span className="block text-muted-foreground mt-1">
                This will free up ~{formatBytes(tableToClear?.estimatedBytes || 0)} of space in your
                Supabase database. All core user accounts, posts, and gatherings will remain 100%
                safe and intact.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isClearing} className="rounded-xl">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmClear}
              disabled={isClearing}
              className="bg-destructive hover:bg-destructive/90 text-white rounded-xl gap-1.5"
            >
              {isClearing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Clearing table...</span>
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4" />
                  <span>Confirm &amp; Clear Table</span>
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
