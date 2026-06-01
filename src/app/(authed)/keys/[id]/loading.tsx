import {
  StatGridSkeleton,
  ChartCardSkeleton,
  CardWithRowsSkeleton,
  BannerSkeleton,
} from "@/components/skeletons";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardHeader, CardContent } from "@/components/ui/card";

export default function KeyDetailLoading() {
  return (
    <div className="flex flex-col gap-6 sm:gap-8" aria-busy aria-live="polite">
      <span className="sr-only">Loading key…</span>

      <Skeleton className="h-3 w-24" />

      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-3 w-32" />
          <div className="flex items-center gap-2 flex-wrap">
            <Skeleton className="h-8 w-64 max-w-full" />
            <Skeleton className="h-4 w-16 rounded-full" />
            <Skeleton className="h-4 w-20 rounded-full" />
          </div>
          <Skeleton className="h-3 w-72 max-w-full" />
        </div>
        <div className="flex gap-2 shrink-0">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-8 w-28" />
        </div>
      </header>

      <StatGridSkeleton />

      <BannerSkeleton />

      <section className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <ChartCardSkeleton className="lg:col-span-3" />
        <Card className="lg:col-span-2">
          <CardHeader>
            <Skeleton className="h-4 w-32" />
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Skeleton className="h-8 w-40" />
            <Skeleton className="h-2.5 w-full rounded-full" />
            <div className="space-y-2 pt-2 border-t border-[var(--color-border)]">
              <div className="flex justify-between">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-3 w-16" />
              </div>
              <div className="flex justify-between">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-3 w-16" />
              </div>
              <div className="flex justify-between">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      <CardWithRowsSkeleton rows={6} />

      <Card>
        <CardHeader>
          <Skeleton className="h-4 w-20" />
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4">
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
            <div className="flex gap-2">
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-8 w-20" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
