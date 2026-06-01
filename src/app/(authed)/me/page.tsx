import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Activity,
  Target,
  Wallet,
  Hash,
  KeyRound,
  UserCircle,
  AlertTriangle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/stat-card";
import { PurposeBar } from "@/components/purpose-bar";
import { BudgetBar } from "@/components/budget-bar";
import { EmptyState } from "@/components/empty-state";
import { RequestsTable } from "@/components/requests-table";
import { DailyChart } from "@/components/daily-chart";
import { ChangePasswordForm } from "@/components/change-password-form";
import { formatUsd, formatTokens, relativeTime } from "@/lib/utils";
import { getCurrentUser } from "@/lib/auth";
import {
  aggregateUserStats,
  getDailySeriesForUser,
  listKeysForUserWithStats,
  listRecentRequestsForUser,
} from "@/lib/user-stats";

export const dynamic = "force-dynamic";

export default async function MePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [keys, recentRows, series] = await Promise.all([
    listKeysForUserWithStats(user.id),
    listRecentRequestsForUser(user.id, 25),
    getDailySeriesForUser(user.id, 14),
  ]);
  const agg = aggregateUserStats(keys);
  const denom = agg.totalCostCents || 1;
  const onPct = (agg.onPurposeCostCents / denom) * 100;
  const offPct = (agg.offPurposeCostCents / denom) * 100;
  const pendingPct = (agg.pendingCostCents / denom) * 100;
  const trackedKeys = keys.filter(
    (k) => k.purposeClarity === "clear" && !!k.encryptedKey
  );

  return (
    <div className="flex flex-col gap-6 sm:gap-8">
      <header className="flex flex-col gap-1">
        <p className="text-xs uppercase tracking-wider text-[var(--color-fg-subtle)]">
          Your account
        </p>
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
          {user.displayName?.trim() || user.email}
        </h1>
        <div className="flex items-center gap-2 flex-wrap text-sm text-[var(--color-fg-muted)]">
          <span className="font-mono text-[12px]">{user.email}</span>
          <Badge tone={user.role === "admin" ? "brand" : "neutral"}>
            {user.role}
          </Badge>
          <span className="text-[11px] text-[var(--color-fg-subtle)]">
            Member since {new Date(user.createdAt).toLocaleDateString()}
          </span>
          {user.lastLoginAt && (
            <span className="text-[11px] text-[var(--color-fg-subtle)]">
              · Last sign-in {relativeTime(user.lastLoginAt)}
            </span>
          )}
        </div>
      </header>

      <section
        aria-label="Your stats"
        className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4"
      >
        <StatCard
          label="Assigned keys"
          value={agg.keyCount}
          hint={
            agg.keyCount > 0
              ? `${trackedKeys.length} tracked`
              : "Ask an admin to assign you a key"
          }
          icon={<KeyRound className="h-3.5 w-3.5" />}
        />
        <StatCard
          label="This month"
          value={formatUsd(agg.monthToDateCostCents)}
          hint={
            agg.monthlyBudgetCents > 0
              ? `of ${formatUsd(agg.monthlyBudgetCents)} total budget`
              : "no budgets set"
          }
          icon={<Wallet className="h-3.5 w-3.5" />}
          accent
        />
        <StatCard
          label="Total tokens"
          value={formatTokens(agg.totalTokens)}
          hint="across your keys"
          icon={<Activity className="h-3.5 w-3.5" />}
        />
        <StatCard
          label="On-purpose"
          value={agg.totalCostCents > 0 ? `${onPct.toFixed(0)}%` : "—"}
          hint={
            agg.totalCostCents > 0
              ? `${offPct.toFixed(0)}% off-purpose`
              : "No proxied requests yet"
          }
          icon={<Target className="h-3.5 w-3.5" />}
        />
      </section>

      {agg.keyCount > 0 && (
        <section
          aria-label="Your monthly budget"
          className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 sm:p-6"
        >
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <h2 className="text-sm font-medium text-[var(--color-fg-muted)] uppercase tracking-wider">
                Combined monthly budget
              </h2>
              <p className="text-2xl font-semibold tracking-tight mt-1">
                {formatUsd(agg.monthToDateCostCents)}{" "}
                <span className="text-sm text-[var(--color-fg-muted)] font-normal">
                  of {formatUsd(agg.monthlyBudgetCents)} this cycle
                </span>
              </p>
            </div>
          </div>
          <BudgetBar
            className="mt-4"
            size="lg"
            spentCents={agg.monthToDateCostCents}
            budgetCents={agg.monthlyBudgetCents}
          />
        </section>
      )}

      {agg.totalCostCents > 0 && (
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
                {formatUsd(agg.onPurposeCostCents)}{" "}
                <span className="text-sm text-[var(--color-fg-muted)] font-normal">
                  of {formatUsd(agg.totalCostCents)} on-purpose
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

      <section className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Daily spend (last 14 days)</CardTitle>
          </CardHeader>
          <CardContent>
            <DailyChart data={series} />
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Hash className="h-4 w-4 text-[var(--color-fg-subtle)]" />
              Requests
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <p className="text-3xl font-semibold tracking-tight">
              {agg.requestCount}
            </p>
            <p className="text-sm text-[var(--color-fg-muted)]">
              total proxied requests across your assigned keys
            </p>
          </CardContent>
        </Card>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-base font-semibold tracking-tight">
          Keys assigned to you
        </h2>
        {keys.length === 0 ? (
          <EmptyState
            icon={<UserCircle className="h-8 w-8" />}
            title="No keys assigned yet"
            description="An admin needs to assign you to one or more API keys before stats appear here."
          />
        ) : (
          <ul className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {keys.map((k) => (
              <li key={k.id}>
                <Card className="p-4 sm:p-5">
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
                          ? "Purpose unclear — admin needs to rename"
                          : "Proxy not enabled for this key"}
                      </p>
                    )}
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <Card>
          <CardHeader>
            <CardTitle>Recent requests</CardTitle>
          </CardHeader>
          <CardContent>
            {recentRows.length === 0 ? (
              <p className="text-sm text-[var(--color-fg-subtle)] py-6 text-center">
                No proxied requests yet on your keys.
              </p>
            ) : (
              <>
                <RequestsTable rows={recentRows.map((r) => r.request)} />
                <p className="pt-3 text-[11px] text-[var(--color-fg-subtle)]">
                  Showing the most recent {recentRows.length} proxied requests across all keys assigned to you.
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </section>

      <section>
        <Card>
          <CardHeader>
            <CardTitle>Change password</CardTitle>
          </CardHeader>
          <CardContent>
            <ChangePasswordForm />
          </CardContent>
        </Card>
      </section>

      {user.role === "user" && agg.keyCount === 0 && (
        <div
          role="status"
          className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-[var(--radius-card)] border border-[color-mix(in_oklab,var(--color-warning)_30%,transparent)] bg-[color-mix(in_oklab,var(--color-warning)_8%,transparent)] p-4"
        >
          <AlertTriangle
            className="h-5 w-5 text-[var(--color-warning)] shrink-0"
            aria-hidden
          />
          <div className="flex-1 text-sm">
            <p className="font-medium">No assigned keys</p>
            <p className="text-[var(--color-fg-muted)] mt-0.5">
              Your stats are empty because no API keys are assigned to your account. Contact an admin.
            </p>
          </div>
          <Button asChild variant="secondary" size="sm">
            <Link href="mailto:">Contact admin</Link>
          </Button>
        </div>
      )}
    </div>
  );
}
