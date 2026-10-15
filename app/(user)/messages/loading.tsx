import { Skeleton } from "@/components/ui/skeleton";

export default function MessagesLoading() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-6 min-h-[calc(100vh-5rem)] flex flex-col animate-in fade-in duration-100">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="space-y-1.5">
          <Skeleton className="h-8 w-36 rounded-lg" />
          <Skeleton className="h-4 w-60 rounded-md" />
        </div>
        <Skeleton className="h-9 w-28 rounded-lg" />
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b mb-6 pb-2">
        <Skeleton className="h-9 w-44 rounded-lg" />
        <Skeleton className="h-9 w-40 rounded-lg" />
      </div>

      {/* Conversation List Skeletons */}
      <div className="space-y-3 flex-1">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="flex items-center gap-4 p-4 rounded-2xl border bg-card/60 shadow-xs"
          >
            <Skeleton className="h-12 w-12 rounded-2xl shrink-0" />
            <div className="flex-1 space-y-2 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <Skeleton className="h-4 w-40 rounded-md" />
                <Skeleton className="h-3 w-16 rounded-md shrink-0" />
              </div>
              <Skeleton className="h-3.5 w-3/4 rounded-md" />
            </div>
            <Skeleton className="h-5 w-5 rounded-full shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}
