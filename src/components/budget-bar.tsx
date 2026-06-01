import { cn, formatUsd } from "@/lib/utils";

export function BudgetBar({
  spentCents,
  budgetCents,
  size = "md",
  showLabels = false,
  className,
}: {
  spentCents: number;
  budgetCents: number;
  size?: "sm" | "md" | "lg";
  showLabels?: boolean;
  className?: string;
}) {
  const pct = budgetCents > 0 ? (spentCents / budgetCents) * 100 : 0;
  const clamped = Math.min(100, Math.max(0, pct));
  const status: "ok" | "near" | "over" =
    pct >= 100 ? "over" : pct >= 75 ? "near" : "ok";

  const fillColor =
    status === "over"
      ? "var(--color-danger)"
      : status === "near"
        ? "var(--color-warning)"
        : "var(--color-brand)";

  const heightCls = size === "sm" ? "h-1.5" : size === "lg" ? "h-2.5" : "h-2";

  return (
    <div className={className}>
      <div
        role="progressbar"
        aria-valuenow={Math.round(pct)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${formatUsd(spentCents)} of ${formatUsd(budgetCents)} monthly budget used`}
        className={cn(
          "relative w-full overflow-hidden rounded-full bg-[var(--color-surface-2)]",
          heightCls
        )}
      >
        <div
          style={{ width: `${clamped}%`, background: fillColor }}
          className="h-full transition-[width]"
        />
        {pct > 100 && (
          <div
            aria-hidden
            className="absolute inset-y-0 right-0 w-1 bg-[var(--color-danger)] opacity-70"
          />
        )}
      </div>
      {showLabels && (
        <div className="mt-1.5 flex justify-between items-center text-[11px] text-[var(--color-fg-muted)] gap-2">
          <span className="font-mono tabular-nums">
            <span
              className={
                status === "over"
                  ? "text-[var(--color-danger)] font-medium"
                  : status === "near"
                    ? "text-[var(--color-warning)] font-medium"
                    : ""
              }
            >
              {formatUsd(spentCents)}
            </span>
            <span className="text-[var(--color-fg-subtle)]">
              {" "}/ {formatUsd(budgetCents)}
            </span>
          </span>
          <span
            className={cn(
              "font-mono tabular-nums",
              status === "over" && "text-[var(--color-danger)]",
              status === "near" && "text-[var(--color-warning)]"
            )}
          >
            {Math.round(pct)}%
          </span>
        </div>
      )}
    </div>
  );
}
