import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { notFound, redirect } from "next/navigation";
import { CalendarDays, MapPin, Users, ShieldAlert, CheckCircle, ArrowLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { formatEventDate, formatEventTime, safeFormatDate } from "@/lib/utils";

function getServiceRoleSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createAdminClient(url, key);
}

export const dynamic = "force-dynamic";

export default async function AdminEventDetailsPage({ 
  params 
}: { 
  params: Promise<{ eventId: string }> | { eventId: string } 
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/admin/mingle/login");

  const resolvedParams = await params;
  const eventId = resolvedParams?.eventId;

  if (!eventId) notFound();

  const adminSupabase = getServiceRoleSupabase();

  const { data: rawEvent, error } = await adminSupabase
    .from("events")
    .select("*, event_attendees(count)")
    .eq("id", eventId)
    .maybeSingle();

  if (error || !rawEvent) notFound();

  // Fetch organizer profile safely
  const hostId = rawEvent.creator_id || rawEvent.organizer_id;
  let organizer: any = null;
  if (hostId) {
    const { data: prof } = await adminSupabase
      .from("profiles")
      .select("id, username, full_name, avatar_url")
      .eq("id", hostId)
      .maybeSingle();
    organizer = prof;
  }

  const isPublic = rawEvent.visibility ? rawEvent.visibility !== "private" : Boolean(rawEvent.is_public ?? true);
  const dateStr = formatEventDate(rawEvent.event_date, rawEvent.start_time, rawEvent.created_at, "MMMM d, yyyy");
  const timeStr = formatEventTime(rawEvent.start_time, rawEvent.end_time, "TBA");

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <Link
            href="/admin/events"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-2 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to All Events</span>
          </Link>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{rawEvent.title}</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Event ID: <span className="font-mono">{rawEvent.id}</span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link href={`/events/${rawEvent.id}`} target="_blank">
            <Button variant="outline" size="sm" className="text-xs h-9">
              Public Page
            </Button>
          </Link>
          <Link href={`/events/${rawEvent.id}/edit`}>
            <Button size="sm" className="text-xs h-9">
              Edit Event
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2 rounded-2xl shadow-xs">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base sm:text-lg">Event Overview</CardTitle>
              <Badge variant={isPublic ? "outline" : "secondary"} className="text-xs">
                {isPublic ? "Public Event" : "Private Event"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="text-xs font-semibold text-muted-foreground mb-1">Description</h3>
              <div className="p-3.5 bg-muted/40 rounded-xl whitespace-pre-wrap text-xs sm:text-sm leading-relaxed border">
                {rawEvent.description || "No description provided."}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
              <div className="p-3 rounded-xl border bg-card">
                <h3 className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1.5">
                  <CalendarDays className="h-3.5 w-3.5 text-primary" /> Schedule
                </h3>
                <p className="text-sm font-bold">{dateStr}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{timeStr}</p>
              </div>

              <div className="p-3 rounded-xl border bg-card">
                <h3 className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-rose-500" /> Location
                </h3>
                <p className="text-sm font-bold">{rawEvent.location_name || "Sorsogon"}</p>
                {rawEvent.address && (
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">{rawEvent.address}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="rounded-2xl shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="h-4 w-4 text-primary" /> Host / Organizer
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-xs text-muted-foreground">Organizer Name</p>
                <p className="font-bold text-sm">{organizer?.full_name || organizer?.username || "Unknown"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Handle</p>
                <p className="text-xs font-semibold text-primary">@{organizer?.username || "user"}</p>
              </div>
              {organizer?.username && (
                <Link href={`/profile/${organizer.username}`} target="_blank" className="block pt-1">
                  <Button variant="outline" size="sm" className="w-full text-xs h-8">
                    View Organizer Profile
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-2xl shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">System Telemetry</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-xs">
              <div className="flex justify-between items-center py-1 border-b">
                <span className="text-muted-foreground">Current Status</span>
                <Badge variant="outline" className="text-[10px] capitalize">
                  {rawEvent.status || "published"}
                </Badge>
              </div>
              <div className="flex justify-between items-center py-1 border-b">
                <span className="text-muted-foreground">Created Date</span>
                <span className="font-medium">{safeFormatDate(rawEvent.created_at, "MMM d, yyyy")}</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-muted-foreground">Confirmed Attendees</span>
                <span className="font-bold text-foreground">
                  {rawEvent.event_attendees?.[0]?.count ?? 0}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
