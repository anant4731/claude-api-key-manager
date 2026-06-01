import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";

export function StatCard({
  label,
  value,
  hint,
  icon,
  className,
  accent = false,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
  accent?: boolean;
}) {
  return (
    <Card
      className={cn(
        "p-4 sm:p-5 flex flex-col gap-1.5 relative overflow-hidden",
        accent &&
          "before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-[var(--color-brand)] before:to-transparent",
        className
      )}
    >
      <div className="flex items-center justify-between text-[11px] uppercase tracking-wider text-[var(--color-fg-subtle)]">
        <span>{label}</span>
        {icon && <span className="text-[var(--color-fg-muted)]">{icon}</span>}
      </div>
      <div className="text-2xl sm:text-3xl font-semibold tracking-tight tabular-nums">
        {value}
      </div>
      {hint && (
        <div className="text-xs text-[var(--color-fg-muted)]">{hint}</div>
      )}
    </Card>
  );
}
