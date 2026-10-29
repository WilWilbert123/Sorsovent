import { Skeleton } from "@/components/ui/skeleton";

export default function ExploreLoading() {
  return (
    <div className="max-w-4xl mx-auto px-3.5 sm:px-4 py-3.5 sm:py-6 space-y-5 animate-in fade-in duration-100">
      {/* Header & Search */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Skeleton className="h-7 w-28 rounded-lg" />
          <Skeleton className="h-7 w-24 rounded-full" />
        </div>
        <Skeleton className="h-10 w-full rounded-xl" />
        <div className="flex gap-1.5 overflow-hidden">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-7 w-18 rounded-full shrink-0" />
          ))}
        </div>
      </div>

      {/* Map Skeleton */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-28 rounded-md" />
          <Skeleton className="h-4 w-16 rounded-md" />
        </div>
        <Skeleton className="h-44 sm:h-56 w-full rounded-2xl" />
      </div>

      {/* Upcoming Events Skeleton */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-32 rounded-md" />
          <Skeleton className="h-4 w-14 rounded-md" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex sm:flex-col gap-3 p-2.5 rounded-2xl border bg-card/60">
              <Skeleton className="h-20 w-20 sm:h-32 sm:w-full rounded-xl shrink-0" />
              <div className="flex-1 space-y-2 py-1">
                <Skeleton className="h-4 w-3/4 rounded-md" />
                <Skeleton className="h-3 w-1/2 rounded-md" />
                <Skeleton className="h-4 w-24 rounded-md" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
