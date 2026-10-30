import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, User as UserIcon } from "lucide-react";
import { ChatMessages } from "@/components/chat/chat-messages";
import { ChatInput } from "@/components/chat/chat-input";
import { UserPresenceIndicator } from "@/components/presence/user-presence-indicator";
import { Button } from "@/components/ui/button";

function getServiceRoleSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createAdminClient(url, key);
}

export default async function ConversationPage({
  params,
}: {
  params: Promise<{ conversationId: string }> | { conversationId: string };
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const resolvedParams = await params;
  const conversationId = resolvedParams.conversationId;

  const adminClient = getServiceRoleSupabase();

  // Fetch membership, initial messages, and other members in PARALLEL
  const [membershipRes, initialMessagesRes, otherMembersRes] = await Promise.all([
    adminClient
      .from("conversation_members")
      .select("id")
      .eq("conversation_id", conversationId)
      .eq("user_id", user.id)
      .maybeSingle(),
    adminClient
      .from("messages")
      .select(
        `
        id,
        content,
        sender_id,
        created_at,
        profiles!messages_sender_id_fkey (
          username,
          full_name,
          avatar_url
        )
      `
      )
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })
      .limit(100),
    adminClient
      .from("conversation_members")
      .select(
        `
        user_id,
        profiles!conversation_members_user_id_fkey (
          id,
          username,
          full_name,
          display_name,
          avatar_url,
          last_seen_at
        )
      `
      )
      .eq("conversation_id", conversationId)
      .neq("user_id", user.id),
  ]);

  if (!membershipRes.data) {
    notFound();
  }

  const initialMessages = initialMessagesRes.data || [];
  const otherMembers = otherMembersRes.data || [];

  let title = "Direct Message";
  let otherProfile: any = null;

  if (otherMembers.length > 0) {
    otherProfile = Array.isArray(otherMembers[0].profiles)
      ? otherMembers[0].profiles[0]
      : otherMembers[0].profiles;
    title =
      otherProfile?.full_name ||
      otherProfile?.display_name ||
      otherProfile?.username ||
      "Direct Message";

    // Mark unread direct_message notifications from this user as read
    if (otherProfile?.id) {
      await adminClient
        .from("notifications")
        .update({ is_read: true })
        .eq("user_id", user.id)
        .eq("actor_id", otherProfile.id)
        .eq("type", "direct_message")
        .eq("is_read", false);
    }
  }

  const initials = title
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="max-w-4xl mx-auto px-0 sm:px-4 sm:py-3 h-[calc(100dvh-8.5rem)] md:h-[calc(100dvh-2.5rem)] flex flex-col">
      <div className="flex-1 border-0 sm:border rounded-none sm:rounded-2xl bg-card shadow-2xs overflow-hidden flex flex-col h-full">
        {/* Clean Responsive Header */}
        <div className="px-3 py-2.5 sm:px-4 sm:py-3 border-b bg-background/95 backdrop-blur-md flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <Link
              href="/messages?tab=direct"
              className="p-2 -ml-1 rounded-xl hover:bg-muted transition-colors text-muted-foreground hover:text-foreground shrink-0"
              title="Back to chats"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>

            {otherProfile ? (
              <Link
                href={`/profile/${otherProfile.username}`}
                className="flex items-center gap-2.5 min-w-0 group"
              >
                <div className="relative shrink-0">
                  {otherProfile.avatar_url ? (
                    <div className="h-10 w-10 rounded-full overflow-hidden border border-border/60">
                      <img
                        src={otherProfile.avatar_url}
                        alt={title}
                        className="h-full w-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-[#FF5E3A]/15 to-[#FF3366]/15 flex items-center justify-center text-xs font-bold text-[#FF3366] border border-border/60">
                      {initials}
                    </div>
                  )}
                  <UserPresenceIndicator
                    lastSeenAt={otherProfile.last_seen_at}
                    size="sm"
                    avatarDot
                    className="absolute bottom-0 right-0"
                  />
                </div>

                <div className="min-w-0">
                  <p className="font-bold text-sm leading-tight truncate group-hover:text-primary transition-colors">
                    {title}
                  </p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-[11px] text-muted-foreground truncate">
                      @{otherProfile.username}
                    </span>
                    <span className="text-[10px] text-muted-foreground/40">•</span>
                    <UserPresenceIndicator
                      lastSeenAt={otherProfile.last_seen_at}
                      showText={true}
                      size="sm"
                    />
                  </div>
                </div>
              </Link>
            ) : (
              <h2 className="font-bold text-sm truncate">{title}</h2>
            )}
          </div>

          {otherProfile?.username && (
            <Link href={`/profile/${otherProfile.username}`} className="shrink-0">
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-2.5 gap-1.5 text-xs font-semibold rounded-xl"
              >
                <UserIcon className="h-3.5 w-3.5" />
                <span className="hidden xs:inline">Profile</span>
              </Button>
            </Link>
          )}
        </div>

        {/* Messages Body */}
        <ChatMessages
          initialMessages={initialMessages}
          conversationId={conversationId}
          currentUserId={user.id}
        />

        {/* Input Bar */}
        <ChatInput conversationId={conversationId} currentUserId={user.id} />
      </div>
    </div>
  );
}
