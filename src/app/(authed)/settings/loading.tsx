import { PageHeaderSkeleton, CardWithRowsSkeleton } from "@/components/skeletons";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardHeader, CardContent } from "@/components/ui/card";

export default function SettingsLoading() {
  return (
    <div
      className="flex flex-col gap-6 sm:gap-8"
      aria-busy
      aria-live="polite"
    >
      <span className="sr-only">Loading settings…</span>
      <PageHeaderSkeleton />
      <CardWithRowsSkeleton rows={3} />
      <Card>
        <CardHeader>
          <Skeleton className="h-4 w-32" />
        </CardHeader>
        <CardContent className="space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <Skeleton className="h-4 w-32" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-24 w-full rounded-md" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-24 w-full rounded-md" />
        </CardContent>
      </Card>
    </div>
  );
}
