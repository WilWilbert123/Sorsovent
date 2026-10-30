import { Skeleton } from "@/components/ui/skeleton";

export default function AdminSettingsLoading() {
  return (
    <div className="max-w-4xl space-y-6 animate-pulse">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-48 sm:w-60 rounded-xl" />
            <Skeleton className="h-5 w-28 rounded-full" />
          </div>
          <Skeleton className="h-4 w-72 sm:w-96 rounded-md" />
        </div>
        <Skeleton className="h-10 w-36 rounded-xl" />
      </div>

      {/* Top Banner Alert Skeleton */}
      <Skeleton className="h-12 w-full rounded-2xl" />

      {/* Settings Card 1 */}
      <div className="p-6 rounded-2xl border bg-card/60 space-y-4">
        <div className="space-y-1.5">
          <Skeleton className="h-5 w-44 rounded-md" />
          <Skeleton className="h-3 w-64 rounded-md" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <Skeleton className="h-10 rounded-xl" />
          <Skeleton className="h-10 rounded-xl" />
        </div>
        <Skeleton className="h-10 rounded-xl" />
      </div>

      {/* Settings Card 2: Announcement */}
      <div className="p-6 rounded-2xl border bg-card/60 space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-52 rounded-md" />
          <Skeleton className="h-6 w-24 rounded-full" />
        </div>
        <Skeleton className="h-14 rounded-xl" />
        <Skeleton className="h-10 rounded-xl" />
      </div>

      {/* Settings Card 3: Supabase Database Tables Space Monitor Skeleton */}
      <div className="p-6 rounded-2xl border bg-card/60 space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1.5">
            <Skeleton className="h-5 w-64 rounded-md" />
            <Skeleton className="h-3 w-80 rounded-md" />
          </div>
          <Skeleton className="h-9 w-28 rounded-xl" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
        <div className="space-y-2 pt-2">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-14 rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}

