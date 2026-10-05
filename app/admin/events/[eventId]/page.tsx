import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import { CalendarDays, MapPin, Users, ShieldAlert, CheckCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";

export default async function AdminEventDetailsPage({ params }: { params: { eventId: string } }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/admin/login");

  const { data: event } = await supabase
    .from("events")
    .select(`
      *,
      profiles!events_organizer_id_fkey (username, full_name, email)
    `)
    .eq("id", params.eventId)
    .single();

  if (!event) notFound();

  const organizer = Array.isArray(event.profiles) ? event.profiles[0] : event.profiles;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Event Moderation</h1>
          <p className="text-muted-foreground mt-2">
            Review and manage event details for ID: {event.id}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="text-destructive border-destructive hover:bg-destructive/10">
            <ShieldAlert className="mr-2 h-4 w-4" /> Take Down Event
          </Button>
          <Button>
            <CheckCircle className="mr-2 h-4 w-4" /> Approve Event
          </Button>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Event Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-1">Title</h3>
              <p className="font-medium text-lg">{event.title}</p>
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-1">Description</h3>
              <div className="p-4 bg-muted/50 rounded-md whitespace-pre-wrap text-sm">
                {event.description || "No description provided."}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1 flex items-center gap-1">
                  <CalendarDays className="h-4 w-4" /> Start Time
                </h3>
                <p className="text-sm font-medium">{format(new Date(event.start_time), "PPP p")}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1 flex items-center gap-1">
                  <MapPin className="h-4 w-4" /> Location
                </h3>
                <p className="text-sm font-medium">{event.location_name}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" /> Organizer Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Name</h3>
                <p className="font-medium">{organizer?.full_name || organizer?.username}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Username</h3>
                <p className="font-medium">@{organizer?.username}</p>
              </div>
              <Button variant="secondary" className="w-full mt-4">View Full Profile</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>System Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Visibility</span>
                <span className="font-medium">{event.is_public ? "Public" : "Private"}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Created</span>
                <span className="font-medium">{format(new Date(event.created_at), "MMM d, yyyy")}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Attendees</span>
                <span className="font-medium">{event.attendee_count || 0}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
