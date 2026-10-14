import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ChatMessages } from "@/components/chat/chat-messages";
import { ChatInput } from "@/components/chat/chat-input";

function getServiceRoleSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
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
      .select(`
        id,
        content,
        sender_id,
        created_at,
        profiles!messages_sender_id_fkey (
          username,
          full_name,
          avatar_url
        )
      `)
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })
      .limit(100),
    adminClient
      .from("conversation_members")
      .select(`
        user_id,
        profiles!conversation_members_user_id_fkey (
          id,
          username,
          full_name,
          display_name,
          avatar_url
        )
      `)
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
    otherProfile = otherMembers[0].profiles;
    title =
      otherProfile?.full_name ||
      otherProfile?.display_name ||
      otherProfile?.username ||
      "Direct Message";
  }

  return (
    <div className="max-w-4xl mx-auto px-0 md:px-4 md:py-6 h-[calc(100vh-3.5rem)] md:h-screen flex flex-col">
      <div className="flex-1 border-0 md:border rounded-none md:rounded-2xl bg-card shadow-sm overflow-hidden flex flex-col h-full">
        {/* Header */}
        <div className="p-3.5 sm:p-4 border-b bg-muted/30 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link
              href="/messages?tab=direct"
              className="p-2 -ml-1 rounded-xl hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
              title="Back to messages"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>

            {otherProfile ? (
              <Link
                href={`/profile/${otherProfile.username}`}
                className="flex items-center gap-3 hover:opacity-85 transition-opacity"
              >
                {/* Only render avatar if an actual image exists */}
                {otherProfile.avatar_url ? (
                  <div className="h-9 w-9 rounded-full overflow-hidden border shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={otherProfile.avatar_url}
                      alt={title}
                      className="h-full w-full object-cover"
                    />
                  </div>
                ) : null}
                <div>
                  <h2 className="font-semibold text-sm leading-tight hover:underline">
                    {title}
                  </h2>
                  <p className="text-[11px] text-muted-foreground">
                    @{otherProfile.username}
                  </p>
                </div>
              </Link>
            ) : (
              <h2 className="font-semibold text-sm">{title}</h2>
            )}
          </div>
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
