"use client";

import { useState, useEffect, useMemo, useTransition } from "react";
import Link from "next/link";
import {
  CalendarDays,
  Search,
  MapPin,
  MoreHorizontal,
  Trash2,
  Eye,
  CheckCircle2,
  Clock,
  XCircle,
  Archive,
  Lock,
  Globe,
  Loader2,
  Plus,
  RefreshCw,
  Users,
  Edit,
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { createClient } from "@/lib/supabase/client";
import { getCategoryEmoji } from "@/lib/map/emoji";
import { formatEventDate, formatEventTime } from "@/lib/utils";
import { toast } from "sonner";

export interface AdminEventItem {
  id: string;
  title: string;
  description?: string;
  category?: string;
  event_date?: string;
  start_time?: string;
  end_time?: string;
  location_name?: string;
  visibility?: string;
  is_public: boolean;
  status: string;
  attendee_count: number;
  created_at: string;
  creator_id?: string;
  profiles?: {
    username: string;
    full_name: string | null;
  } | null;
}

interface AdminEventsManagerProps {
  initialEvents: AdminEventItem[];
}

export function AdminEventsManager({ initialEvents }: AdminEventsManagerProps) {
  const [events, setEvents] = useState<AdminEventItem[]>(initialEvents);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [deleteEventTarget, setDeleteEventTarget] = useState<AdminEventItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Keep synced if initialEvents change
  useEffect(() => {
    setEvents(initialEvents);
  }, [initialEvents]);

  // Fetch latest events with safe creator joins
  const fetchLiveEvents = async () => {
    setIsRefreshing(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("events")
        .select("*, event_attendees(count)")
        .order("created_at", { ascending: false });

      if (!error && data) {
        const creatorIds = Array.from(
          new Set(data.map((e: any) => e.creator_id || e.organizer_id).filter(Boolean))
        );

        let profileMap = new Map<string, any>();
        if (creatorIds.length > 0) {
          const { data: profiles } = await supabase
            .from("profiles")
            .select("id, username, full_name")
            .in("id", creatorIds);

          if (profiles) {
            profileMap = new Map(profiles.map((p: any) => [p.id, p]));
          }
        }

        const formatted = data.map((e: any) => {
          const prof = profileMap.get(e.creator_id || e.organizer_id);
          return {
            id: e.id,
            title: e.title || "Untitled Event",
            description: e.description || "",
            category: e.category || "General",
            event_date: e.event_date || "",
            start_time: e.start_time || "",
            end_time: e.end_time || "",
            location_name: e.location_name || "",
            visibility: e.visibility || (e.is_public === false ? "private" : "public"),
            is_public: e.visibility ? e.visibility !== "private" : Boolean(e.is_public ?? true),
            status: e.status || "published",
            attendee_count: e.event_attendees?.[0]?.count ?? 0,
            created_at: e.created_at || new Date().toISOString(),
            creator_id: e.creator_id || e.organizer_id || "",
            profiles: prof
              ? {
                  username: prof.username || "user",
                  full_name: prof.full_name || prof.username || "User",
                }
              : null,
          };
        });
        setEvents(formatted);
      }
    } catch (err) {
      console.error("Error refreshing admin events:", err);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Realtime subscription on events and attendees
  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel("admin-realtime-events")
      .on("postgres_changes", { event: "*", schema: "public", table: "events" }, () => {
        fetchLiveEvents();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "event_attendees" }, () => {
        fetchLiveEvents();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Filtered events
  const filteredEvents = useMemo(() => {
    return events.filter((ev) => {
      const author = Array.isArray(ev.profiles) ? ev.profiles[0] : ev.profiles;
      const matchesSearch =
        ev.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (ev.location_name && ev.location_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (author?.username && author.username.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (ev.category && ev.category.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesStatus =
        selectedStatus === "all" ||
        (selectedStatus === "published" && (ev.status === "published" || !ev.status)) ||
        (selectedStatus === "draft" && ev.status === "draft") ||
        (selectedStatus === "cancelled" && ev.status === "cancelled") ||
        (selectedStatus === "archived" && ev.status === "archived") ||
        (selectedStatus === "public" && ev.is_public) ||
        (selectedStatus === "private" && !ev.is_public);

      return matchesSearch && matchesStatus;
    });
  }, [events, searchQuery, selectedStatus]);

  // Statistics
  const totalAttendeesCount = useMemo(() => {
    return events.reduce((acc, curr) => acc + (curr.attendee_count || 0), 0);
  }, [events]);

  const publishedCount = useMemo(() => {
    return events.filter((e) => e.status === "published" || !e.status).length;
  }, [events]);

  // Handle Event Status / Visibility Change
  const handleUpdateStatus = async (eventId: string, newStatus?: string, isPublic?: boolean, title?: string) => {
    startTransition(async () => {
      try {
        const res = await fetch("/api/admin/actions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "update_event_status",
            payload: { eventId, status: newStatus, is_public: isPublic, title },
          }),
        });

        const data = await res.json();
        if (data.success) {
          toast.success(data.message || "Event updated.");
          setEvents((prev) =>
            prev.map((e) =>
              e.id === eventId
                ? {
                    ...e,
                    ...(newStatus !== undefined ? { status: newStatus } : {}),
                    ...(isPublic !== undefined ? { is_public: isPublic, visibility: isPublic ? "public" : "private" } : {}),
                  }
                : e
            )
          );
        } else {
          toast.error(data.error || "Failed to update event.");
        }
      } catch (err: any) {
        toast.error(err.message || "Network error");
      }
    });
  };

  // Handle Event Delete / Take Down
  const handleConfirmDelete = async () => {
    if (!deleteEventTarget) return;
    setIsDeleting(true);

    try {
      const res = await fetch("/api/admin/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "delete_event",
          payload: { eventId: deleteEventTarget.id, title: deleteEventTarget.title },
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success(data.message || "Event removed.");
        setEvents((prev) => prev.filter((e) => e.id !== deleteEventTarget.id));
      } else {
        toast.error(data.error || "Failed to delete event.");
      }
    } catch (err: any) {
      toast.error(err.message || "Network error");
    } finally {
      setIsDeleting(false);
      setDeleteEventTarget(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Events Management</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Real-time monitoring, attendance tracking, and platform moderation
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchLiveEvents}
            disabled={isRefreshing}
            className="gap-1.5 text-xs h-9 cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Link href="/events/create" target="_blank">
            <Button size="sm" className="gap-1.5 text-xs h-9 cursor-pointer">
              <Plus className="h-4 w-4" /> Create Event
            </Button>
          </Link>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3.5">
        <div className="bg-card border rounded-xl sm:rounded-2xl p-2.5 sm:p-4 shadow-2xs">
          <p className="text-[10px] sm:text-xs font-medium text-muted-foreground">Total Events</p>
          <p className="text-lg sm:text-2xl font-bold mt-0.5 text-foreground">{events.length}</p>
        </div>
        <div className="bg-card border rounded-xl sm:rounded-2xl p-2.5 sm:p-4 shadow-2xs">
          <p className="text-[10px] sm:text-xs font-medium text-muted-foreground">Published</p>
          <p className="text-lg sm:text-2xl font-bold mt-0.5 text-emerald-600 dark:text-emerald-400">{publishedCount}</p>
        </div>
        <div className="bg-card border rounded-xl sm:rounded-2xl p-2.5 sm:p-4 shadow-2xs">
          <p className="text-[10px] sm:text-xs font-medium text-muted-foreground">Total Attendees</p>
          <p className="text-lg sm:text-2xl font-bold mt-0.5 text-primary">{totalAttendeesCount}</p>
        </div>
        <div className="bg-card border rounded-xl sm:rounded-2xl p-2.5 sm:p-4 shadow-2xs">
          <p className="text-[10px] sm:text-xs font-medium text-muted-foreground">Private Events</p>
          <p className="text-lg sm:text-2xl font-bold mt-0.5 text-amber-600 dark:text-amber-400">
            {events.filter((e) => !e.is_public).length}
          </p>
        </div>
      </div>

      {/* Controls: Search & Status Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by title, location, organizer..."
            className="pl-8 h-8 sm:h-9 text-xs bg-card rounded-xl"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 no-scrollbar">
          {[
            { id: "all", label: "All" },
            { id: "published", label: "Published" },
            { id: "draft", label: "Draft" },
            { id: "cancelled", label: "Cancelled" },
            { id: "public", label: "Public" },
            { id: "private", label: "Private" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedStatus(tab.id)}
              className={`px-2.5 py-1 rounded-lg text-[11px] sm:text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                selectedStatus === tab.id
                  ? "bg-primary text-primary-foreground font-semibold shadow-2xs"
                  : "bg-card border text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── 1. Mobile Cards View (md:hidden) ── */}
      <div className="md:hidden space-y-3">
        {filteredEvents.length === 0 ? (
          <div className="text-center py-12 px-4 rounded-2xl border border-dashed bg-card/60 space-y-2">
            <CalendarDays className="h-8 w-8 mx-auto opacity-30 text-muted-foreground" />
            <p className="text-sm font-semibold">No events found</p>
            <p className="text-xs text-muted-foreground">Try clearing filters or search keywords</p>
          </div>
        ) : (
          filteredEvents.map((event) => {
            const author = Array.isArray(event.profiles) ? event.profiles[0] : event.profiles;
            const emoji = getCategoryEmoji(event.category, event.title);
            const isCancelled = event.status === "cancelled";
            const isDraft = event.status === "draft";
            const dateStr = formatEventDate(event.event_date, event.start_time, event.created_at, "MMM d, yyyy");
            const timeStr = formatEventTime(event.start_time, event.end_time, "TBA");

            return (
              <div key={event.id} className="p-3.5 rounded-2xl border bg-card shadow-2xs space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-lg shrink-0">{emoji}</span>
                    <div className="min-w-0">
                      <Link
                        href={`/events/${event.id}`}
                        className="font-bold text-sm hover:text-primary transition-colors line-clamp-1 text-foreground"
                      >
                        {event.title}
                      </Link>
                      <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                        {event.category && `${event.category} • `}
                        {author?.username ? `@${author.username}` : "Community Event"}
                      </p>
                    </div>
                  </div>

                  {/* Actions Dropdown */}
                  <DropdownMenu>
                    <DropdownMenuTrigger className="inline-flex items-center justify-center h-8 w-8 rounded-lg hover:bg-accent shrink-0 cursor-pointer">
                      <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuLabel className="text-xs">Event Options</DropdownMenuLabel>
                      <DropdownMenuItem
                        onClick={() => window.open(`/events/${event.id}`, "_blank")}
                        className="cursor-pointer text-xs"
                      >
                        <Eye className="mr-2 h-3.5 w-3.5 text-muted-foreground" /> View Public Page
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => { window.location.href = `/events/${event.id}/edit`; }}
                        className="cursor-pointer text-xs"
                      >
                        <Edit className="mr-2 h-3.5 w-3.5 text-muted-foreground" /> Edit Details
                      </DropdownMenuItem>

                      <DropdownMenuSeparator />
                      <DropdownMenuLabel className="text-xs">Change Status</DropdownMenuLabel>
                      <DropdownMenuItem
                        onClick={() => handleUpdateStatus(event.id, "published", undefined, event.title)}
                        disabled={isPending || event.status === "published"}
                        className="text-xs"
                      >
                        <CheckCircle2 className="mr-2 h-3.5 w-3.5 text-emerald-600" /> Set to Published
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleUpdateStatus(event.id, "cancelled", undefined, event.title)}
                        disabled={isPending || isCancelled}
                        className="text-xs"
                      >
                        <XCircle className="mr-2 h-3.5 w-3.5 text-amber-600" /> Mark Cancelled
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleUpdateStatus(event.id, undefined, !event.is_public, event.title)}
                        disabled={isPending}
                        className="text-xs"
                      >
                        {event.is_public ? (
                          <>
                            <Lock className="mr-2 h-3.5 w-3.5 text-muted-foreground" /> Make Private
                          </>
                        ) : (
                          <>
                            <Globe className="mr-2 h-3.5 w-3.5 text-muted-foreground" /> Make Public
                          </>
                        )}
                      </DropdownMenuItem>

                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => setDeleteEventTarget(event)}
                        className="text-destructive focus:text-destructive text-xs cursor-pointer"
                      >
                        <Trash2 className="mr-2 h-3.5 w-3.5 text-destructive" />
                        Take Down Event
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Metadata Row */}
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground pt-1 border-t">
                  <span className="inline-flex items-center gap-1 font-medium text-foreground/80">
                    <CalendarDays className="h-3 w-3 text-primary shrink-0" />
                    <span>{dateStr}</span>
                    <span className="text-muted-foreground/60">•</span>
                    <span>{timeStr}</span>
                  </span>

                  {event.location_name && (
                    <span className="inline-flex items-center gap-1 truncate max-w-[150px]">
                      <MapPin className="h-3 w-3 text-rose-500 shrink-0" />
                      <span className="truncate">{event.location_name}</span>
                    </span>
                  )}

                  <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                    <Users className="h-3 w-3 shrink-0" />
                    <span>{event.attendee_count} attending</span>
                  </span>
                </div>

                {/* Badges footer */}
                <div className="flex items-center justify-between gap-2 pt-1">
                  <Badge variant={event.is_public ? "outline" : "secondary"} className="text-[10px] gap-1">
                    {event.is_public ? <Globe className="h-2.5 w-2.5" /> : <Lock className="h-2.5 w-2.5" />}
                    <span>{event.is_public ? "Public" : "Private"}</span>
                  </Badge>

                  {isCancelled ? (
                    <Badge variant="destructive" className="text-[10px] gap-1">
                      <XCircle className="h-2.5 w-2.5" /> Cancelled
                    </Badge>
                  ) : isDraft ? (
                    <Badge variant="secondary" className="text-[10px] gap-1 border-amber-500/30 text-amber-600">
                      <Clock className="h-2.5 w-2.5" /> Draft
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px] gap-1 border-emerald-500/40 text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="h-2.5 w-2.5" /> Published
                    </Badge>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ── 2. Desktop Table View (hidden md:block) ── */}
      <div className="hidden md:block rounded-xl sm:rounded-2xl border bg-card overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="font-semibold text-xs py-2 px-4">Event &amp; Details</TableHead>
                <TableHead className="font-semibold text-xs py-2 px-4">Date &amp; Time</TableHead>
                <TableHead className="font-semibold text-xs py-2 px-4">Location</TableHead>
                <TableHead className="font-semibold text-xs py-2 px-4">Organizer</TableHead>
                <TableHead className="font-semibold text-xs py-2 px-4">Visibility</TableHead>
                <TableHead className="font-semibold text-xs py-2 px-4">Status</TableHead>
                <TableHead className="text-right font-semibold text-xs py-2 px-4">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEvents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-44 text-center">
                    <div className="flex flex-col items-center justify-center text-muted-foreground space-y-2">
                      <CalendarDays className="h-8 w-8 opacity-30" />
                      <p className="text-sm font-medium">No events found</p>
                      <p className="text-xs text-muted-foreground">Try clearing filters or search keywords</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredEvents.map((event) => {
                  const author = Array.isArray(event.profiles) ? event.profiles[0] : event.profiles;
                  const emoji = getCategoryEmoji(event.category, event.title);
                  const isCancelled = event.status === "cancelled";
                  const isDraft = event.status === "draft";
                  const isArchived = event.status === "archived";
                  const dateStr = formatEventDate(event.event_date, event.start_time, event.created_at, "MMM d, yyyy");
                  const timeStr = formatEventTime(event.start_time, event.end_time, "TBA");

                  return (
                    <TableRow key={event.id} className="hover:bg-muted/40 transition-colors">
                      {/* Event Title */}
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <span className="text-xl shrink-0">{emoji}</span>
                          <div className="min-w-0">
                            <Link
                              href={`/events/${event.id}`}
                              className="font-semibold text-sm hover:text-primary transition-colors line-clamp-1"
                            >
                              {event.title}
                            </Link>
                            <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1 font-medium text-foreground/80">
                                <Users className="h-3 w-3 text-primary shrink-0" />
                                {event.attendee_count} attending
                              </span>
                              {event.category && <span>• {event.category}</span>}
                            </div>
                          </div>
                        </div>
                      </TableCell>

                      {/* Date & Time */}
                      <TableCell className="text-xs whitespace-nowrap">
                        <div>
                          <p className="font-medium text-foreground">{dateStr}</p>
                          <p className="text-muted-foreground text-[11px]">{timeStr}</p>
                        </div>
                      </TableCell>

                      {/* Location */}
                      <TableCell className="text-xs text-muted-foreground">
                        <div className="flex items-center gap-1 truncate max-w-[150px]">
                          <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
                          <span className="truncate">{event.location_name || "Sorsogon"}</span>
                        </div>
                      </TableCell>

                      {/* Organizer */}
                      <TableCell className="text-xs">
                        {author ? (
                          <Link
                            href={`/profile/${author.username}`}
                            className="font-medium hover:text-primary transition-colors block truncate max-w-[120px]"
                          >
                            @{author.username}
                          </Link>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>

                      {/* Visibility */}
                      <TableCell>
                        {event.is_public ? (
                          <Badge variant="outline" className="text-[10px] gap-1 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/5">
                            <Globe className="h-2.5 w-2.5" /> Public
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-[10px] gap-1">
                            <Lock className="h-2.5 w-2.5" /> Private
                          </Badge>
                        )}
                      </TableCell>

                      {/* Status */}
                      <TableCell>
                        {isCancelled ? (
                          <Badge variant="destructive" className="text-[10px] gap-1">
                            <XCircle className="h-2.5 w-2.5" /> Cancelled
                          </Badge>
                        ) : isDraft ? (
                          <Badge variant="secondary" className="text-[10px] gap-1 border-amber-500/30 text-amber-600">
                            <Clock className="h-2.5 w-2.5" /> Draft
                          </Badge>
                        ) : isArchived ? (
                          <Badge variant="outline" className="text-[10px] gap-1 text-muted-foreground">
                            <Archive className="h-2.5 w-2.5" /> Archived
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] gap-1 border-emerald-500/40 text-emerald-600 dark:text-emerald-400">
                            <CheckCircle2 className="h-2.5 w-2.5" /> Published
                          </Badge>
                        )}
                      </TableCell>

                      {/* Actions Menu */}
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger className="inline-flex items-center justify-center h-8 w-8 rounded-lg hover:bg-accent transition-colors cursor-pointer">
                            <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuLabel className="text-xs">Event Options</DropdownMenuLabel>
                            <DropdownMenuItem
                              onClick={() => window.open(`/events/${event.id}`, "_blank")}
                              className="cursor-pointer text-xs"
                            >
                              <Eye className="mr-2 h-3.5 w-3.5 text-muted-foreground" /> View Event Page
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => { window.location.href = `/events/${event.id}/edit`; }}
                              className="cursor-pointer text-xs"
                            >
                              <Edit className="mr-2 h-3.5 w-3.5 text-muted-foreground" /> Edit Details
                            </DropdownMenuItem>

                            <DropdownMenuSeparator />
                            <DropdownMenuLabel className="text-xs">Change Status</DropdownMenuLabel>

                            <DropdownMenuItem
                              onClick={() => handleUpdateStatus(event.id, "published", undefined, event.title)}
                              disabled={isPending || event.status === "published"}
                              className="text-xs"
                            >
                              <CheckCircle2 className="mr-2 h-3.5 w-3.5 text-emerald-600" /> Set to Published
                            </DropdownMenuItem>

                            <DropdownMenuItem
                              onClick={() => handleUpdateStatus(event.id, "cancelled", undefined, event.title)}
                              disabled={isPending || isCancelled}
                              className="text-xs"
                            >
                              <XCircle className="mr-2 h-3.5 w-3.5 text-amber-600" /> Mark Cancelled
                            </DropdownMenuItem>

                            <DropdownMenuItem
                              onClick={() => handleUpdateStatus(event.id, undefined, !event.is_public, event.title)}
                              disabled={isPending}
                              className="text-xs"
                            >
                              {event.is_public ? (
                                <>
                                  <Lock className="mr-2 h-3.5 w-3.5 text-muted-foreground" /> Make Private
                                </>
                              ) : (
                                <>
                                  <Globe className="mr-2 h-3.5 w-3.5 text-muted-foreground" /> Make Public
                                </>
                              )}
                            </DropdownMenuItem>

                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => setDeleteEventTarget(event)}
                              className="text-destructive focus:text-destructive text-xs cursor-pointer"
                            >
                              <Trash2 className="mr-2 h-3.5 w-3.5 text-destructive" />
                              Take Down Event
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Delete Confirmation Alert */}
      <AlertDialog open={!!deleteEventTarget} onOpenChange={(open: boolean) => !open && setDeleteEventTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to take down this event?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <strong>"{deleteEventTarget?.title}"</strong> and remove all associated attendee records. This action will be logged in the admin audit history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e: React.MouseEvent) => {
                e.preventDefault();
                handleConfirmDelete();
              }}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
              Take Down
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
