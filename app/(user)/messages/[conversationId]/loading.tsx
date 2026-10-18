import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft } from "lucide-react";

export default function ConversationLoading() {
  return (
    <div className="max-w-4xl mx-auto px-0 md:px-4 md:py-6 h-[calc(100dvh-8.5rem)] md:h-[calc(100vh-4rem)] flex flex-col animate-in fade-in duration-100">
      <div className="flex-1 border-0 md:border rounded-none md:rounded-2xl bg-card shadow-sm overflow-hidden flex flex-col h-full">
        {/* Header Skeleton */}
        <div className="p-3.5 sm:p-4 border-b bg-muted/30 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 -ml-1 text-muted-foreground">
              <ArrowLeft className="h-5 w-5 opacity-40" />
            </div>
            <Skeleton className="h-9 w-9 rounded-full shrink-0" />
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-28 rounded-md" />
              <Skeleton className="h-3 w-16 rounded-md" />
            </div>
          </div>
        </div>

        {/* Message Bubbles Skeleton */}
        <div className="flex-1 p-4 space-y-4 overflow-y-auto">
          {/* Received bubble */}
          <div className="flex items-start gap-2 max-w-[75%]">
            <Skeleton className="h-8 w-8 rounded-full shrink-0" />
            <div className="space-y-1.5">
              <Skeleton className="h-10 w-48 rounded-2xl rounded-tl-xs" />
              <Skeleton className="h-2.5 w-12 rounded-xs" />
            </div>
          </div>

          {/* Sent bubble */}
          <div className="flex flex-col items-end gap-1.5 ml-auto max-w-[75%]">
            <Skeleton className="h-12 w-64 rounded-2xl rounded-tr-xs bg-primary/20" />
            <Skeleton className="h-2.5 w-12 rounded-xs" />
          </div>

          {/* Received bubble */}
          <div className="flex items-start gap-2 max-w-[75%]">
            <Skeleton className="h-8 w-8 rounded-full shrink-0" />
            <div className="space-y-1.5">
              <Skeleton className="h-14 w-56 rounded-2xl rounded-tl-xs" />
              <Skeleton className="h-2.5 w-12 rounded-xs" />
            </div>
          </div>

          {/* Sent bubble */}
          <div className="flex flex-col items-end gap-1.5 ml-auto max-w-[75%]">
            <Skeleton className="h-8 w-36 rounded-2xl rounded-tr-xs bg-primary/20" />
            <Skeleton className="h-2.5 w-12 rounded-xs" />
          </div>
        </div>

        {/* Input Bar Skeleton */}
        <div className="p-3 border-t bg-card flex items-center gap-2">
          <Skeleton className="h-10 flex-1 rounded-xl" />
          <Skeleton className="h-10 w-10 rounded-xl shrink-0" />
        </div>
      </div>
    </div>
  );
}
