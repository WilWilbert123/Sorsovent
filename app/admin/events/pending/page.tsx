import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { CalendarDays } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { format } from "date-fns";

export default async function AdminPendingEventsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/admin/login");

  // For this template, we'll fetch recently created events
  // In a real app with an approval queue, you'd filter by status="pending"
  const { data: events } = await supabase
    .from("events")
    .select(`
      id, title, start_time, location_name, created_at,
      profiles!events_organizer_id_fkey (username, full_name)
    `)
    .order("created_at", { ascending: false })
    .limit(20);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Pending Events</h1>
        <p className="text-muted-foreground mt-2">
          Review events waiting for administrator approval before being published to the public directory.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Approval Queue</CardTitle>
          <CardDescription>Events requiring review</CardDescription>
        </CardHeader>
        <CardContent>
          {!events || events.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground border rounded-md border-dashed">
              <CalendarDays className="h-10 w-10 mx-auto mb-4 opacity-50" />
              <p>No pending events in the queue.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {events.map((event: any) => {
                const author = Array.isArray(event.profiles) ? event.profiles[0] : event.profiles;
                return (
                  <div key={event.id} className="flex flex-col md:flex-row justify-between md:items-center p-4 border rounded-lg gap-4 bg-card hover:bg-muted/30 transition-colors">
                    <div>
                      <h4 className="font-semibold text-base">{event.title}</h4>
                      <div className="text-sm text-muted-foreground mt-1 flex flex-wrap gap-x-4 gap-y-1">
                        <span>Org: @{author?.username}</span>
                        <span>Time: {format(new Date(event.start_time), "MMM d, yyyy")}</span>
                        <span>Loc: {event.location_name}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Link href={`/admin/events/${event.id}`}>
                        <Button variant="outline" size="sm">Review Details</Button>
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
