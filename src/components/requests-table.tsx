import { Badge } from "@/components/ui/badge";
import { formatUsd, formatTokens, relativeTime } from "@/lib/utils";
import { type RequestRow } from "@/lib/db/schema";
import { CircleCheck, CircleAlert, CircleDashed, CircleX } from "lucide-react";

function classBadge(c: string) {
  if (c === "on_purpose")
    return (
      <Badge tone="success">
        <CircleCheck className="h-3 w-3" />
        On-purpose
      </Badge>
    );
  if (c === "off_purpose")
    return (
      <Badge tone="danger">
        <CircleAlert className="h-3 w-3" />
        Off-purpose
      </Badge>
    );
  if (c === "failed")
    return (
      <Badge tone="warning">
        <CircleX className="h-3 w-3" />
        Failed
      </Badge>
    );
  return (
    <Badge tone="neutral">
      <CircleDashed className="h-3 w-3" />
      Pending
    </Badge>
  );
}

export function RequestsTable({ rows }: { rows: RequestRow[] }) {
  if (rows.length === 0) {
    return (
      <div className="text-sm text-[var(--color-fg-subtle)] py-8 text-center">
        No proxied requests yet.
      </div>
    );
  }
  return (
    <div className="overflow-x-auto -mx-2 sm:mx-0">
      <table className="w-full text-sm min-w-[640px]">
        <thead>
          <tr className="text-[10.5px] uppercase tracking-wider text-[var(--color-fg-subtle)] border-b border-[var(--color-border)]">
            <th className="text-left font-medium py-2 px-2 sm:px-3">When</th>
            <th className="text-left font-medium py-2 px-2 sm:px-3">Model</th>
            <th className="text-right font-medium py-2 px-2 sm:px-3">Tokens</th>
            <th className="text-right font-medium py-2 px-2 sm:px-3">Cost</th>
            <th className="text-left font-medium py-2 px-2 sm:px-3">Verdict</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--color-border)]">
          {rows.map((r) => {
            const total =
              r.inputTokens +
              r.outputTokens +
              r.cacheReadTokens +
              r.cacheWriteTokens;
            return (
              <tr key={r.id} className="hover:bg-[var(--color-surface-2)]/40">
                <td
                  className="py-2.5 px-2 sm:px-3 text-[var(--color-fg-muted)] whitespace-nowrap"
                  title={r.timestamp}
                >
                  {relativeTime(r.timestamp)}
                </td>
                <td className="py-2.5 px-2 sm:px-3 font-mono text-xs">
                  {r.model}
                </td>
                <td className="py-2.5 px-2 sm:px-3 text-right tabular-nums">
                  {formatTokens(total)}
                </td>
                <td className="py-2.5 px-2 sm:px-3 text-right tabular-nums font-mono">
                  {formatUsd(r.costCents)}
                </td>
                <td className="py-2.5 px-2 sm:px-3">
                  <div className="flex flex-col gap-1">
                    {classBadge(r.classification)}
                    {r.classificationReason && (
                      <span className="text-[11px] text-[var(--color-fg-subtle)] line-clamp-2">
                        {r.classificationReason}
                      </span>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
