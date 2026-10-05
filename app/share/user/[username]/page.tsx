import { redirect } from "next/navigation";

// A quick redirect interceptor for sharing deep-links
export default function ShareUserRedirect({ params }: { params: { username: string } }) {
  // We can add tracking metrics here later
  redirect(`/users/${params.username}`);
}
