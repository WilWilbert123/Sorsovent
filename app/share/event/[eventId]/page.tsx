import { redirect } from "next/navigation";

// A quick redirect interceptor for sharing deep-links
export default function ShareEventRedirect({ params }: { params: { eventId: string } }) {
  // We can add tracking metrics here later
  redirect(`/events/${params.eventId}`);
}
