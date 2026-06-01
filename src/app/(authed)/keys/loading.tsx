import {
  PageHeaderSkeleton,
  KeysListSkeleton,
} from "@/components/skeletons";

export default function KeysLoading() {
  return (
    <div className="flex flex-col gap-6" aria-busy aria-live="polite">
      <span className="sr-only">Loading keys…</span>
      <PageHeaderSkeleton />
      <KeysListSkeleton count={4} />
    </div>
  );
}
