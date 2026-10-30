import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { CalendarDays, MapPin, User, ArrowUpRight } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { formatEventDate, formatEventTime } from "@/lib/utils";

function getServiceRoleSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createAdminClient(url, key);
}

export const dynamic = "force-dynamic";

export default async function AdminPendingEventsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/admin/mingle/login");

  const adminSupabase = getServiceRoleSupabase();
  let events: any[] = [];

  try {
    const { data: rawEvents } = await adminSupabase
      .from("events")
      .select("*, event_attendees(count)")
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(50);

    const dataList = rawEvents && rawEvents.length > 0 ? rawEvents : [];

    if (dataList.length > 0) {
      const creatorIds = Array.from(
        new Set(dataList.map((e: any) => e.creator_id || e.organizer_id).filter(Boolean))
      );

      let profileMap = new Map<string, any>();
      if (creatorIds.length > 0) {
        const { data: profiles } = await adminSupabase
          .from("profiles")
          .select("id, username, full_name, avatar_url")
          .in("id", creatorIds);
        if (profiles) {
          profileMap = new Map(profiles.map((p: any) => [p.id, p]));
        }
      }

      events = dataList.map((e: any) => ({
        ...e,
        profiles: profileMap.get(e.creator_id || e.organizer_id) || null,
      }));
    }
  } catch (err) {
    console.error("Error loading pending events:", err);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Pending Events Queue</h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1">
          Review community gatherings waiting for administrator approval before publishing
        </p>
      </div>

      <Card className="rounded-2xl border shadow-xs">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base sm:text-lg">Approval Queue</CardTitle>
              <CardDescription className="text-xs">Events requiring moderation review</CardDescription>
            </div>
            <Badge variant="secondary" className="text-xs font-mono">
              {events.length} Pending
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {events.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground border rounded-2xl border-dashed bg-muted/10 space-y-2">
              <CalendarDays className="h-10 w-10 mx-auto opacity-30 text-muted-foreground" />
              <p className="text-sm font-semibold text-foreground">All clear!</p>
              <p className="text-xs text-muted-foreground">No events are currently awaiting approval in the queue.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {events.map((event: any) => {
                const author = Array.isArray(event.profiles) ? event.profiles[0] : event.profiles;
                const dateStr = formatEventDate(event.event_date, event.start_time, event.created_at, "MMM d, yyyy");
                const timeStr = formatEventTime(event.start_time, event.end_time, "TBA");

                return (
                  <div
                    key={event.id}
                    className="flex flex-col sm:flex-row justify-between sm:items-center p-3.5 sm:p-4 border rounded-xl gap-3 bg-card hover:bg-muted/30 transition-colors shadow-2xs"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="text-[10px] border-amber-500/40 text-amber-600 bg-amber-500/5">
                          Pending Review
                        </Badge>
                        {event.category && (
                          <span className="text-[11px] text-muted-foreground">
                            • {event.category}
                          </span>
                        )}
                      </div>

                      <h4 className="font-bold text-sm sm:text-base text-foreground truncate">{event.title}</h4>

                      <div className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-x-3 gap-y-1">
                        <span className="inline-flex items-center gap-1 font-medium text-foreground/80">
                          <User className="h-3 w-3 text-primary shrink-0" />
                          <span>@{author?.username || "organizer"}</span>
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <CalendarDays className="h-3 w-3 text-primary shrink-0" />
                          <span>{dateStr} • {timeStr}</span>
                        </span>
                        {event.location_name && (
                          <span className="inline-flex items-center gap-1 truncate max-w-[150px]">
                            <MapPin className="h-3 w-3 text-rose-500 shrink-0" />
                            <span className="truncate">{event.location_name}</span>
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                      <Link href={`/admin/events/${event.id}`}>
                        <Button variant="default" size="sm" className="text-xs h-8 gap-1.5 rounded-lg cursor-pointer">
                          <span>Review</span>
                          <ArrowUpRight className="h-3.5 w-3.5" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
