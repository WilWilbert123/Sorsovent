import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import { EditEventForm } from "@/components/events/edit-event-form";

export default async function EditEventPage({
  params,
}: {
  params: Promise<{ eventId: string }> | { eventId: string };
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const resolvedParams = await params;
  const eventId = resolvedParams?.eventId;

  if (!eventId) notFound();

  const { data: event } = await supabase
    .from("events")
    .select("*")
    .eq("id", eventId)
    .single();

  if (!event) notFound();

  const isOrganizer = event.creator_id === user.id || event.organizer_id === user.id;

  if (!isOrganizer) {
    // Check if user is an admin
    const { data: role } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (role?.role !== "ADMIN" && role?.role !== "SUPER_ADMIN") {
      redirect(`/events/${eventId}`);
    }
  }

  return <EditEventForm event={event} />;
}
