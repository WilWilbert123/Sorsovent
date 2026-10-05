import { createClient } from "@/lib/supabase/server";
import { MessageSquareOff, Plus } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";

export default async function MessagesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  // Fetch conversations where the user is a member
  const { data: conversations } = await supabase
    .from("conversation_members")
    .select(`
      conversation_id,
      conversations (
        id,
        created_at,
        updated_at
      )
    `)
    .eq("user_id", user.id)
    .order("joined_at", { ascending: false });

  const hasConversations = conversations && conversations.length > 0;

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 h-[calc(100vh-4rem)] md:h-screen flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Messages</h1>
        <Button size="sm" className="gap-2">
          <Plus className="h-4 w-4" /> New Message
        </Button>
      </div>
      
      {!hasConversations ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-8 border rounded-2xl bg-card shadow-sm">
          <div className="h-20 w-20 bg-primary/10 rounded-full flex items-center justify-center mb-6">
            <MessageSquareOff className="h-10 w-10 text-primary opacity-60" />
          </div>
          <h2 className="text-xl font-semibold mb-2">No messages yet</h2>
          <p className="text-muted-foreground max-w-sm mx-auto mb-6">
            When you connect with people or RSVP to events, your conversations will appear here. Start a chat with someone from the community.
          </p>
          <Link href="/explore">
            <Button>Find People & Events</Button>
          </Link>
        </div>
      ) : (
        <div className="flex-1 border rounded-2xl bg-card shadow-sm overflow-hidden flex flex-col">
          {/* Conversation List will be populated here via a real-time component */}
          <div className="p-4 border-b bg-muted/30">
            <h3 className="font-medium text-sm text-muted-foreground">Recent Conversations</h3>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
             <p className="text-sm text-muted-foreground text-center py-8">Select a conversation or start a new one.</p>
          </div>
        </div>
      )}
    </div>
  );
}
