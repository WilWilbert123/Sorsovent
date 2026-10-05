import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ChatMessages } from "@/components/chat/chat-messages";
import { ChatInput } from "@/components/chat/chat-input";

export default async function ConversationPage({ params }: { params: { conversationId: string } }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  // Verify the user is a member of this conversation
  const { data: membership } = await supabase
    .from("conversation_members")
    .select("id")
    .eq("conversation_id", params.conversationId)
    .eq("user_id", user.id)
    .single();

  if (!membership) {
    notFound();
  }

  // Fetch initial messages
  const { data: initialMessages } = await supabase
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
    .eq("conversation_id", params.conversationId)
    .order("created_at", { ascending: true })
    .limit(100);

  // Determine conversation title by getting the other members
  const { data: otherMembers } = await supabase
    .from("conversation_members")
    .select(`
      profiles!conversation_members_user_id_fkey (
        username,
        full_name
      )
    `)
    .eq("conversation_id", params.conversationId)
    .neq("user_id", user.id);

  let title = "Chat";
  if (otherMembers && otherMembers.length > 0) {
    const names = otherMembers.map(m => {
      const p = m.profiles as any;
      return p?.full_name || p?.username;
    }).filter(Boolean);
    title = names.join(", ");
  }

  return (
    <div className="max-w-4xl mx-auto px-0 md:px-4 md:py-6 h-[calc(100vh-3.5rem)] md:h-screen flex flex-col">
      <div className="flex-1 border-0 md:border rounded-none md:rounded-2xl bg-card shadow-sm overflow-hidden flex flex-col h-full">
        <div className="p-4 border-b bg-muted/30 flex items-center gap-3">
          <Link href="/messages" className="p-2 -ml-2 rounded-full hover:bg-muted md:hidden">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h2 className="font-semibold">{title}</h2>
        </div>
        
        <ChatMessages 
          initialMessages={initialMessages || []} 
          conversationId={params.conversationId}
          currentUserId={user.id}
        />
        
        <ChatInput 
          conversationId={params.conversationId}
          currentUserId={user.id}
        />
      </div>
    </div>
  );
}
