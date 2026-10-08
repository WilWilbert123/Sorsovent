import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { NotificationsView } from "@/components/notifications/notifications-view";

export default async function NotificationsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  // Fetch real notifications with actor & event details
  const { data: rawNotifs } = await supabase
    .from("notifications")
    .select(
      `
      id,
      user_id,
      actor_id,
      type,
      event_id,
      post_id,
      is_read,
      created_at,
      actor:profiles!notifications_actor_id_fkey (id, display_name, full_name, username, avatar_url),
      event:events (id, title, category)
    `
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(40);

  const initialNotifications = (rawNotifs || []).map((n: any) => ({
    id: n.id,
    user_id: n.user_id,
    actor_id: n.actor_id,
    type: n.type,
    event_id: n.event_id,
    post_id: n.post_id,
    is_read: n.is_read,
    created_at: n.created_at,
    actor: Array.isArray(n.actor) ? n.actor[0] : n.actor,
    event: Array.isArray(n.event) ? n.event[0] : n.event,
  }));

  return (
    <NotificationsView
      initialNotifications={initialNotifications}
      currentUserId={user.id}
    />
  );
}
