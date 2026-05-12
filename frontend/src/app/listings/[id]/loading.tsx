import { Skeleton } from '@/components/ui/Skeleton';

export default function Loading() {
  return (
    <div className="mx-auto max-w-5xl px-4 pt-24 pb-12">
      <div className="rounded-3xl border border-purple-100 bg-white/85 backdrop-blur-sm p-6 shadow-sm">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[380px_1fr] items-start">
          {/* LEFT — Gallery */}
          <div className="space-y-4">
            <Skeleton className="aspect-square w-full rounded-2xl" />
            <div className="grid grid-cols-5 gap-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="aspect-square rounded-lg" />
              ))}
            </div>
            <div className="rounded-2xl border border-gray-100 bg-white p-4 space-y-2">
              <Skeleton className="h-3 w-24" />
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex justify-between">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-3 w-28" />
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT — Info */}
          <div className="space-y-4">
            <Skeleton className="h-3 w-40" />
            <Skeleton className="h-7 w-full" />
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-10 w-48" />
            <div className="flex gap-3">
              <Skeleton className="h-12 w-32" />
              <Skeleton className="h-12 flex-1" />
            </div>
            <Skeleton className="h-20 w-full rounded-2xl" />
            <Skeleton className="h-32 w-full rounded-2xl" />
            <Skeleton className="h-48 w-full rounded-2xl" />
          </div>
        </div>
      </div>
    </div>
  );
}
