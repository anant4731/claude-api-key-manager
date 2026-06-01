import Link from "next/link";
import { redirect } from "next/navigation";
import {
  KeyRound,
  Wallet,
  Activity,
  Target,
  ArrowUpRight,
  AlertTriangle,
} from "lucide-react";
import { listKeys } from "@/lib/keys";
import { getCurrentUser } from "@/lib/auth";
import { StatCard } from "@/components/stat-card";
import { PurposeBar } from "@/components/purpose-bar";
import { BudgetBar } from "@/components/budget-bar";
import { EmptyState } from "@/components/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatUsd, formatTokens } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const me = await getCurrentUser();
  if (!me) redirect("/login");
  if (me.role !== "admin") redirect("/me");

  const keys = await safeList();
  const active = keys.filter((k) => k.status === "active");
  const proxied = keys.filter((k) => k.encryptedKey);
  const unclear = keys.filter((k) => k.purposeClarity === "unclear");

  const trackedKeys = keys.filter((k) => k.purposeClarity === "clear");

  const totals = trackedKeys.reduce(
    (a, k) => {
      a.cost += k.stats.totalCostCents;
      a.tokens += k.stats.totalTokens;
      a.onCost += k.stats.onPurposeCostCents;
      a.offCost += k.stats.offPurposeCostCents;
      a.pendingCost += k.stats.pendingCostCents;
      a.requests += k.stats.requestCount;
      return a;
    },
    { cost: 0, tokens: 0, onCost: 0, offCost: 0, pendingCost: 0, requests: 0 }
  );

  const budgetTotals = keys.reduce(
    (a, k) => {
      a.budget += k.monthlyBudgetCents;
      a.spent += k.stats.monthToDateCostCents;
      if (k.stats.monthToDateCostCents >= k.monthlyBudgetCents) a.over += 1;
      return a;
    },
    { budget: 0, spent: 0, over: 0 }
  );

  const totalDenom = totals.cost || 1;
  const onPct = (totals.onCost / totalDenom) * 100;
  const offPct = (totals.offCost / totalDenom) * 100;
  const pendingPct = (totals.pendingCost / totalDenom) * 100;

  return (
    <div className="flex flex-col gap-6 sm:gap-8">
      <header className="flex flex-col gap-1">
        <p className="text-xs uppercase tracking-wider text-[var(--color-fg-subtle)]">
          Overview
        </p>
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
          Dashboard
        </h1>
        <p className="text-sm text-[var(--color-fg-muted)] max-w-2xl">
          Aggregated usage, spend, and purpose alignment across every API key in your connected Anthropic organization.
        </p>
      </header>

      {unclear.length > 0 && (
        <div
          role="status"
          className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-[var(--radius-card)] border border-[color-mix(in_oklab,var(--color-warning)_30%,transparent)] bg-[color-mix(in_oklab,var(--color-warning)_8%,transparent)] p-4"
        >
          <AlertTriangle
            className="h-5 w-5 text-[var(--color-warning)] shrink-0"
            aria-hidden
          />
          <div className="flex-1 text-sm">
            <p className="font-medium">
              {unclear.length} {unclear.length === 1 ? "key has" : "keys have"} an unclear purpose
            </p>
            <p className="text-[var(--color-fg-muted)] mt-0.5">
              Purpose tracking is disabled until you rename them in the Anthropic Console.
            </p>
          </div>
          <Button asChild variant="secondary" size="sm">
            <Link href="/keys">Review keys</Link>
          </Button>
        </div>
      )}

      <section
        aria-label="Summary statistics"
        className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4"
      >
        <StatCard
          label="Keys"
          value={keys.length}
          hint={`${active.length} active · ${proxied.length} proxied`}
          icon={<KeyRound className="h-3.5 w-3.5" />}
        />
        <StatCard
          label="This month"
          value={formatUsd(budgetTotals.spent)}
          hint={
            budgetTotals.budget > 0
              ? `of ${formatUsd(budgetTotals.budget)} total budget`
              : "no budgets set"
          }
          icon={<Wallet className="h-3.5 w-3.5" />}
          accent
        />
        <StatCard
          label="Total tokens"
          value={formatTokens(totals.tokens)}
          hint="proxied keys only"
          icon={<Activity className="h-3.5 w-3.5" />}
        />
        <StatCard
          label="On-purpose"
          value={totals.cost > 0 ? `${onPct.toFixed(0)}%` : "—"}
          hint={
            totals.cost > 0
              ? `${offPct.toFixed(0)}% off-purpose`
              : "Enable proxy on a key to track"
          }
          icon={<Target className="h-3.5 w-3.5" />}
        />
      </section>

      {keys.length > 0 && (
        <section
          aria-label="Monthly budget summary"
          className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 sm:p-6"
        >
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <h2 className="text-sm font-medium text-[var(--color-fg-muted)] uppercase tracking-wider">
                Monthly budget
              </h2>
              <p className="text-2xl font-semibold tracking-tight mt-1">
                {formatUsd(budgetTotals.spent)}{" "}
                <span className="text-sm text-[var(--color-fg-muted)] font-normal">
                  of {formatUsd(budgetTotals.budget)} this cycle
                </span>
              </p>
            </div>
            {budgetTotals.over > 0 && (
              <Badge tone="danger">
                <AlertTriangle className="h-3 w-3" />
                {budgetTotals.over} over budget
              </Badge>
            )}
          </div>
          <BudgetBar
            className="mt-4"
            size="lg"
            spentCents={budgetTotals.spent}
            budgetCents={budgetTotals.budget}
          />
        </section>
      )}

      {totals.cost > 0 && (
        <section
          aria-label="Overall purpose breakdown"
          className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 sm:p-6"
        >
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <h2 className="text-sm font-medium text-[var(--color-fg-muted)] uppercase tracking-wider">
                Spend alignment
              </h2>
              <p className="text-2xl font-semibold tracking-tight mt-1">
                {formatUsd(totals.onCost)}{" "}
                <span className="text-sm text-[var(--color-fg-muted)] font-normal">
                  of {formatUsd(totals.cost)} on-purpose
                </span>
              </p>
            </div>
          </div>
          <PurposeBar
            className="mt-4"
            size="lg"
            showLegend
            onPct={onPct}
            offPct={offPct}
            pendingPct={pendingPct}
          />
        </section>
      )}

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold tracking-tight">Keys</h2>
          <Button asChild variant="ghost" size="sm">
            <Link href="/keys">
              View all
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>

        {keys.length === 0 ? (
          <EmptyState
            icon={<KeyRound className="h-8 w-8" />}
            title="No keys yet"
            description="Add a key manually, or connect an account (Team/Enterprise plan) to auto-sync your full inventory."
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
          <ul className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {keys.slice(0, 6).map((k) => (
              <li key={k.id}>
                <Link
                  href={`/keys/${k.id}`}
                  className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand)] rounded-[var(--radius-card)]"
                >
                  <Card className="p-4 sm:p-5 hover:bg-[color-mix(in_oklab,var(--color-surface)_60%,var(--color-surface-2)_40%)] transition-colors">
                    <CardContent className="p-0 flex flex-col gap-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-medium tracking-tight truncate">
                              {k.name}
                            </h3>
                            {k.purposeClarity === "unclear" && (
                              <Badge tone="warning">Unclear</Badge>
                            )}
                            {!k.encryptedKey && (
                              <Badge tone="neutral">Not proxied</Badge>
                            )}
                          </div>
                          <p className="text-[11px] text-[var(--color-fg-subtle)] mt-1 font-mono truncate">
                            {k.partialKeyHint}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-mono text-sm tabular-nums">
                            {formatUsd(k.stats.totalCostCents)}
                          </p>
                          <p className="text-[10.5px] text-[var(--color-fg-subtle)] uppercase tracking-wider">
                            {formatTokens(k.stats.totalTokens)} tokens
                          </p>
                        </div>
                      </div>
                      <BudgetBar
                        size="sm"
                        showLabels
                        spentCents={k.stats.monthToDateCostCents}
                        budgetCents={k.monthlyBudgetCents}
                      />
                      {k.purposeClarity === "clear" && k.encryptedKey ? (
                        <PurposeBar
                          onPct={k.stats.onPurposePct}
                          offPct={k.stats.offPurposePct}
                          pendingPct={k.stats.pendingPct}
                        />
                      ) : (
                        <p className="text-[11px] text-[var(--color-fg-subtle)] italic">
                          {k.purposeClarity === "unclear"
                            ? "Purpose unclear — rename to enable tracking"
                            : "Enable proxy to track purpose alignment"}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
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
