import { Skeleton } from "@/components/ui/skeleton";

export default function HomeLoading() {
  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 animate-in fade-in duration-100">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Main Feed Column Skeleton */}
        <div className="lg:col-span-8 w-full max-w-2xl mx-auto space-y-5">
          {/* Post composer skeleton */}
          <div className="p-4 rounded-2xl border bg-card/60 shadow-xs space-y-3">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <Skeleton className="h-10 flex-1 rounded-xl" />
            </div>
            <div className="flex items-center justify-between pt-2 border-t">
              <div className="flex gap-2">
                <Skeleton className="h-8 w-20 rounded-lg" />
                <Skeleton className="h-8 w-20 rounded-lg" />
              </div>
              <Skeleton className="h-8 w-16 rounded-lg" />
            </div>
          </div>

          {/* Feed Post Skeletons */}
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-5 rounded-2xl border bg-card/60 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-11 w-11 rounded-full" />
                  <div className="space-y-1.5">
                    <Skeleton className="h-4 w-32 rounded-md" />
                    <Skeleton className="h-3 w-24 rounded-md" />
                  </div>
                </div>
                <Skeleton className="h-4 w-8 rounded-md" />
              </div>

              <div className="space-y-2">
                <Skeleton className="h-4 w-full rounded-md" />
                <Skeleton className="h-4 w-4/5 rounded-md" />
              </div>

              {i === 1 && <Skeleton className="h-64 w-full rounded-xl" />}

              <div className="flex items-center justify-between pt-3 border-t">
                <div className="flex items-center gap-4">
                  <Skeleton className="h-7 w-16 rounded-md" />
                  <Skeleton className="h-7 w-16 rounded-md" />
                </div>
                <Skeleton className="h-7 w-8 rounded-md" />
              </div>
            </div>
          ))}
        </div>

        {/* Right Community Discovery Column (Desktop) */}
        <div className="hidden lg:block lg:col-span-4 space-y-4">
          <div className="p-5 rounded-2xl border bg-card/60 shadow-xs space-y-4">
            <Skeleton className="h-5 w-36 rounded-md" />
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-xl shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-3.5 w-32 rounded-md" />
                    <Skeleton className="h-3 w-20 rounded-md" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
