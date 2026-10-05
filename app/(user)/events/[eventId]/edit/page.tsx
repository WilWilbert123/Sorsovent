import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function EditEventPage({ params }: { params: { eventId: string } }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const { data: event } = await supabase
    .from("events")
    .select("*")
    .eq("id", params.eventId)
    .single();

  if (!event) redirect("/events");

  if (event.organizer_id !== user.id) {
    // Check if user is an admin
    const { data: role } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();
      
    if (role?.role !== "ADMIN" && role?.role !== "SUPER_ADMIN") {
      redirect(`/events/${params.eventId}`);
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="mb-6">
        <Link href={`/events/${params.eventId}`} className="text-sm text-muted-foreground hover:text-foreground transition-colors mb-2 inline-block">
          ← Back to Event
        </Link>
        <h1 className="text-2xl font-bold">Edit Event</h1>
      </div>
      
      <div className="border rounded-2xl p-6 bg-card">
        <h2 className="text-lg font-semibold mb-4">Event Details</h2>
        <p className="text-sm text-muted-foreground mb-6">
          Update the information for "{event.title}". Note that changing the date or location will notify all attendees.
        </p>
        
        {/* We would render the EventForm component here, passing the event data as initial values */}
        <div className="space-y-4 opacity-50 pointer-events-none">
          <div className="space-y-2">
            <label className="text-sm font-medium">Title</label>
            <input type="text" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={event.title} readOnly />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Description</label>
            <textarea className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={event.description || ""} readOnly />
          </div>
        </div>
        
        <div className="mt-8 flex justify-end gap-2">
          <Link href={`/events/${params.eventId}`}>
            <Button variant="outline">Cancel</Button>
          </Link>
          <Button disabled>Save Changes</Button>
        </div>
      </div>
    </div>
  );
}
