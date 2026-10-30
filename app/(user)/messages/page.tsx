import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { MessagesView } from "@/components/messages/messages-view";
import { getUserChatsOverview } from "@/app/actions/conversations";

export const dynamic = "force-dynamic";

export default async function MessagesPage({
  searchParams,
}: {
  searchParams?: Promise<{ tab?: string }> | { tab?: string };
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const resolvedSearchParams = searchParams ? await searchParams : {};
  const initialTab =
    resolvedSearchParams?.tab === "direct" ? "direct" : "event_chats";

  const { eventChats, directMessages } = await getUserChatsOverview();

  return (
    <MessagesView
      eventChats={eventChats}
      directMessages={directMessages}
      initialTab={initialTab}
    />
  );
}
