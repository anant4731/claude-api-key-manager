import {
  PageHeaderSkeleton,
  StatGridSkeleton,
  BannerSkeleton,
  KeyCardSkeleton,
} from "@/components/skeletons";
import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div className="flex flex-col gap-6 sm:gap-8" aria-busy aria-live="polite">
      <span className="sr-only">Loading dashboard…</span>
      <PageHeaderSkeleton />
      <StatGridSkeleton />
      <BannerSkeleton />
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-20" />
        </div>
        <ul className="grid grid-cols-1 lg:grid-cols-2 gap-3" role="list">
          {Array.from({ length: 4 }).map((_, i) => (
            <li key={i}>
              <KeyCardSkeleton />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
