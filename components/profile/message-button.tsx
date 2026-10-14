"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { MessageSquare, Loader2 } from "lucide-react";
import { getOrCreateDirectConversation } from "@/app/actions/conversations";
import { toast } from "sonner";

export function MessageButton({ targetUserId }: { targetUserId: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleMessage() {
    setLoading(true);
    try {
      const res = await getOrCreateDirectConversation(targetUserId);
      if (res?.conversationId) {
        router.push(`/messages/${res.conversationId}`);
      } else {
        throw new Error("Unable to open chat");
      }
    } catch (err: any) {
      console.error("Failed to start conversation:", err);
      toast.error(err?.message || "Failed to start conversation");
      setLoading(false);
    }
  }

  return (
    <Button
      variant="secondary"
      size="sm"
      className="gap-1.5 cursor-pointer"
      onClick={handleMessage}
      disabled={loading}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquare className="h-4 w-4" />}
      Message
    </Button>
  );
}
