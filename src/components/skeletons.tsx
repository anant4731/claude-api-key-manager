import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function PageHeaderSkeleton() {
  return (
    <header className="flex flex-col gap-2" aria-label="Loading page header">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="h-8 w-56" />
      <Skeleton className="h-4 w-80 max-w-full" />
    </header>
  );
}

export function StatCardSkeleton({ className }: { className?: string }) {
  return (
    <Card className={cn("p-4 sm:p-5 flex flex-col gap-2", className)}>
      <div className="flex items-center justify-between">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-3 w-3 rounded-full" />
      </div>
      <Skeleton className="h-8 w-28" />
      <Skeleton className="h-3 w-24" />
    </Card>
  );
}

export function StatGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <section
      aria-label="Loading statistics"
      className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4"
    >
      {Array.from({ length: count }).map((_, i) => (
        <StatCardSkeleton key={i} />
      ))}
    </section>
  );
}

export function KeyCardSkeleton() {
  return (
    <Card className="p-4 sm:p-5">
      <CardContent className="p-0 flex flex-col gap-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-4 w-16 rounded-full" />
              <Skeleton className="h-4 w-20 rounded-full" />
            </div>
            <Skeleton className="h-3 w-32" />
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-2 w-full rounded-full" />
            <div className="flex justify-between">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-3 w-8" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-2 w-full rounded-full" />
            <Skeleton className="h-3 w-32" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function KeysListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <ul
      role="list"
      aria-label="Loading keys"
      className="grid grid-cols-1 gap-3"
    >
      {Array.from({ length: count }).map((_, i) => (
        <li key={i}>
          <KeyCardSkeleton />
        </li>
      ))}
    </ul>
  );
}

export function ChartCardSkeleton({
  className,
  title = true,
}: {
  className?: string;
  title?: boolean;
}) {
  return (
    <Card className={className}>
      {title && (
        <CardHeader>
          <Skeleton className="h-4 w-32" />
        </CardHeader>
      )}
      <CardContent>
        <Skeleton className="h-48 sm:h-56 w-full rounded-md" />
      </CardContent>
    </Card>
  );
}

export function BannerSkeleton() {
  return (
    <div
      aria-hidden
      className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 sm:p-6 space-y-3"
    >
      <Skeleton className="h-3 w-24" />
      <Skeleton className="h-7 w-48" />
      <Skeleton className="h-2 w-full rounded-full" />
    </div>
  );
}

export function CardWithRowsSkeleton({
  rows = 4,
  className,
}: {
  rows?: number;
  className?: string;
}) {
  return (
    <Card className={className}>
      <CardHeader>
        <Skeleton className="h-4 w-32" />
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {Array.from({ length: rows }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-3 flex-1" />
              <Skeleton className="h-3 w-12" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
