import Link from "next/link";
import { redirect } from "next/navigation";
import { KeyRound, ExternalLink, AlertTriangle } from "lucide-react";
import { listKeys } from "@/lib/keys";
import { getCurrentUser } from "@/lib/auth";
import { EmptyState } from "@/components/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PurposeBar } from "@/components/purpose-bar";
import { BudgetBar } from "@/components/budget-bar";
import { CopyProxyButton } from "@/components/copy-proxy-button";
import { formatUsd, formatTokens, relativeTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function KeysPage() {
  const me = await getCurrentUser();
  if (!me) redirect("/login");
  if (me.role !== "admin") redirect("/me");

  const keys = await safeList();
  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wider text-[var(--color-fg-subtle)]">
            Inventory
          </p>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
            API keys
            <span className="ml-2 text-[var(--color-fg-subtle)] text-base font-normal">
              {keys.length}
            </span>
          </h1>
          <p className="text-sm text-[var(--color-fg-muted)] mt-1">
            Auto-synced from your Anthropic organization. The key&apos;s name is its declared purpose.
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button asChild size="sm">
            <Link href="/keys/new">Add key</Link>
          </Button>
          <Button asChild variant="secondary" size="sm">
            <a
              href="https://platform.claude.com/settings/keys"
              target="_blank"
              rel="noopener noreferrer"
            >
              Open Console
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </Button>
        </div>
      </header>

      {keys.length === 0 ? (
        <EmptyState
          icon={<KeyRound className="h-8 w-8" />}
          title="No keys yet"
          description="Add a key manually (paste its secret), or connect an Anthropic account on a Team/Enterprise plan to auto-sync your full inventory."
          action={
            <div className="flex flex-wrap gap-2 justify-center">
              <Button asChild>
                <Link href="/keys/new">Add a key manually</Link>
              </Button>
              <Button asChild variant="secondary">
                <Link href="/connect">Connect for auto-sync</Link>
              </Button>
            </div>
          }
        />
      ) : (
        <ul className="grid grid-cols-1 gap-3" role="list">
          {keys.map((k) => (
            <li key={k.id}>
              <Card className="p-4 sm:p-5 transition-colors hover:bg-[color-mix(in_oklab,var(--color-surface)_60%,var(--color-surface-2)_40%)]">
                <CardContent className="p-0 flex flex-col gap-4">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Link
                          href={`/keys/${k.id}`}
                          className="font-medium tracking-tight hover:text-[var(--color-brand)] focus:outline-none focus-visible:underline"
                        >
                          {k.name}
                        </Link>
                        {k.status !== "active" && (
                          <Badge tone="warning">{k.status}</Badge>
                        )}
                        <Badge tone={k.anthropicKeyId ? "brand" : "neutral"}>
                          {k.anthropicKeyId ? "Auto-synced" : "Manual"}
                        </Badge>
                        {k.purposeClarity === "unclear" && (
                          <Badge tone="warning">
                            <AlertTriangle className="h-3 w-3" />
                            Unclear purpose
                          </Badge>
                        )}
                        {!k.encryptedKey && (
                          <Badge tone="neutral">Not proxied</Badge>
                        )}
                      </div>
                      {k.purposeClarity === "unclear" && (
                        <p className="text-xs text-[var(--color-fg-muted)] mt-1 max-w-xl">
                          {k.purposeClarityReason}{" "}
                          {k.anthropicKeyId
                            ? "Rename in Console to enable purpose tracking."
                            : "Open this key to rename it and enable purpose tracking."}
                        </p>
                      )}
                      <p className="mt-2 font-mono text-[11px] text-[var(--color-fg-subtle)] truncate">
                        {k.partialKeyHint || "—"}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <p className="font-mono text-lg sm:text-xl tabular-nums">
                        {formatUsd(k.stats.totalCostCents)}
                      </p>
                      <p className="text-[10.5px] text-[var(--color-fg-subtle)] uppercase tracking-wider">
                        {formatTokens(k.stats.totalTokens)} tokens ·{" "}
                        {k.stats.requestCount} req
                      </p>
                      {k.stats.lastRequestAt && (
                        <p className="text-[10.5px] text-[var(--color-fg-subtle)]">
                          last {relativeTime(k.stats.lastRequestAt)}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <p className="text-[10.5px] uppercase tracking-wider text-[var(--color-fg-subtle)] mb-1.5">
                        This month
                      </p>
                      <BudgetBar
                        size="sm"
                        showLabels
                        spentCents={k.stats.monthToDateCostCents}
                        budgetCents={k.monthlyBudgetCents}
                      />
                    </div>
                    <div>
                      <p className="text-[10.5px] uppercase tracking-wider text-[var(--color-fg-subtle)] mb-1.5">
                        Purpose alignment
                      </p>
                      {k.purposeClarity === "clear" && k.encryptedKey ? (
                        <PurposeBar
                          showLegend
                          onPct={k.stats.onPurposePct}
                          offPct={k.stats.offPurposePct}
                          pendingPct={k.stats.pendingPct}
                        />
                      ) : (
                        <p className="text-[11px] text-[var(--color-fg-subtle)] italic">
                          {k.purposeClarity === "unclear"
                            ? "Name doesn't describe a purpose."
                            : "Enable proxy to track."}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    {k.encryptedKey && (
                      <CopyProxyButton proxyToken={k.proxyToken} />
                    )}
                    <Button asChild variant="ghost" size="sm">
                      <Link href={`/keys/${k.id}`}>Open</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

async function safeList() {
  try {
    return await listKeys();
  } catch (e) {
    console.error("listKeys failed:", e);
    return [];
  }
}
