import { cn } from "@/lib/utils";

export function PurposeBar({
  onPct,
  offPct,
  pendingPct,
  className,
  showLegend = false,
  size = "md",
}: {
  onPct: number;
  offPct: number;
  pendingPct: number;
  className?: string;
  showLegend?: boolean;
  size?: "sm" | "md" | "lg";
}) {
  const total = onPct + offPct + pendingPct || 1;
  const on = (onPct / total) * 100;
  const off = (offPct / total) * 100;
  const pending = (pendingPct / total) * 100;

  const heightCls = size === "sm" ? "h-1.5" : size === "lg" ? "h-2.5" : "h-2";

  return (
    <div className={className}>
      <div
        role="img"
        aria-label={`Purpose breakdown: ${onPct.toFixed(0)}% on-purpose, ${offPct.toFixed(0)}% off-purpose, ${pendingPct.toFixed(0)}% pending`}
        className={cn(
          "flex w-full overflow-hidden rounded-full bg-[var(--color-surface-2)]",
          heightCls
        )}
      >
        {on > 0 && (
          <div
            style={{ width: `${on}%` }}
            className="bg-[var(--color-success)] transition-[width]"
          />
        )}
        {off > 0 && (
          <div
            style={{ width: `${off}%` }}
            className="bg-[var(--color-danger)] transition-[width]"
          />
        )}
        {pending > 0 && (
          <div
            style={{ width: `${pending}%` }}
            className="bg-[var(--color-fg-subtle)]/40 transition-[width]"
          />
        )}
      </div>
      {showLegend && (
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-[var(--color-fg-muted)]">
          <LegendDot color="success">
            On-purpose <Pct value={onPct} />
          </LegendDot>
          <LegendDot color="danger">
            Off-purpose <Pct value={offPct} />
          </LegendDot>
          {pendingPct > 0 && (
            <LegendDot color="subtle">
              Pending <Pct value={pendingPct} />
            </LegendDot>
          )}
        </div>
      )}
    </div>
  );
}

function LegendDot({
  color,
  children,
}: {
  color: "success" | "danger" | "subtle";
  children: React.ReactNode;
}) {
  const cls =
    color === "success"
      ? "bg-[var(--color-success)]"
      : color === "danger"
        ? "bg-[var(--color-danger)]"
        : "bg-[var(--color-fg-subtle)]/40";
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn("inline-block h-2 w-2 rounded-full", cls)} />
      {children}
    </span>
  );
}

function Pct({ value }: { value: number }) {
  return (
    <span className="font-mono text-[var(--color-fg)]">
      {value.toFixed(value < 10 && value > 0 ? 1 : 0)}%
    </span>
  );
}
