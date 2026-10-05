import { redirect } from "next/navigation";

// A quick redirect interceptor for sharing deep-links
export default function SharePostRedirect({ params }: { params: { postId: string } }) {
  // We can add tracking metrics here later
  redirect(`/posts/${params.postId}`);
}
