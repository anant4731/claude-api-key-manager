import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import {
  ChevronLeft,
  Activity,
  DollarSign,
  Target,
  Hash,
  AlertTriangle,
  ExternalLink,
  Pencil,
  Wallet,
} from "lucide-react";
import { getKey, listRecentRequests, getDailySeries } from "@/lib/keys";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/stat-card";
import { PurposeBar } from "@/components/purpose-bar";
import { RequestsTable } from "@/components/requests-table";
import { DailyChart } from "@/components/daily-chart";
import { KeyControls } from "@/components/key-controls";
import { BudgetBar } from "@/components/budget-bar";
import { EnableProxyDialog } from "@/components/enable-proxy-dialog";
import { CopyProxyButton } from "@/components/copy-proxy-button";
import { formatUsd, formatTokens, relativeTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function KeyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const me = await getCurrentUser();
  if (!me) redirect("/login");
  if (me.role !== "admin") redirect("/me");

  const { id } = await params;
  const key = await getKey(id);
  if (!key) notFound();
  const [recent, series] = await Promise.all([
    listRecentRequests(id, 25),
    getDailySeries(id, 14),
  ]);

  const trackingActive = key.purposeClarity === "clear" && !!key.encryptedKey;
  const isManual = !key.anthropicKeyId;

  return (
    <div className="flex flex-col gap-6 sm:gap-8">
      <nav aria-label="Breadcrumb" className="text-xs text-[var(--color-fg-muted)]">
        <Link href="/keys" className="inline-flex items-center hover:text-[var(--color-fg)] focus:outline-none focus-visible:underline">
          <ChevronLeft className="h-3.5 w-3.5" />
          All keys
        </Link>
      </nav>

      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wider text-[var(--color-fg-subtle)] mb-1">
            Purpose · {isManual ? "set in this app" : "from Console name"}
          </p>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight truncate">
              {key.name}
            </h1>
            <Badge tone={key.status === "active" ? "success" : "warning"}>
              {key.status}
            </Badge>
            <Badge tone={isManual ? "neutral" : "brand"}>
              {isManual ? "Manual" : "Auto-synced"}
            </Badge>
            {!key.encryptedKey && (
              <Badge tone="neutral">Not proxied</Badge>
            )}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[var(--color-fg-subtle)]">
            <span className="font-mono">{key.partialKeyHint || "—"}</span>
            <span>Created {relativeTime(key.createdAt)}</span>
            {key.anthropicKeyId && (
              <span className="font-mono">{key.anthropicKeyId}</span>
            )}
          </div>
        </div>

        <div className="flex gap-2 flex-wrap">
          {key.encryptedKey && (
            <CopyProxyButton proxyToken={key.proxyToken} />
          )}
          <EnableProxyDialog
            id={key.id}
            partialKeyHint={key.partialKeyHint}
            enabled={!!key.encryptedKey}
          />
        </div>
      </header>

      {key.purposeClarity === "unclear" && (
        <div
          role="status"
          className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-[var(--radius-card)] border border-[color-mix(in_oklab,var(--color-warning)_30%,transparent)] bg-[color-mix(in_oklab,var(--color-warning)_8%,transparent)] p-4"
        >
          <AlertTriangle
            className="h-5 w-5 text-[var(--color-warning)] shrink-0"
            aria-hidden
          />
          <div className="flex-1 text-sm">
            <p className="font-medium">Purpose unclear</p>
            <p className="text-[var(--color-fg-muted)] mt-0.5">
              {key.purposeClarityReason}{" "}
              {isManual
                ? "Rename below — make the name describe what the key is for (e.g. “Classifies support tickets”)."
                : "Rename the key in the Anthropic Console — make the name describe what the key is for (e.g. “Classifies support tickets”), and it'll auto-update on the next sync."}
            </p>
          </div>
          {!isManual && (
            <Button asChild variant="secondary" size="sm">
              <a
                href="https://platform.claude.com/settings/keys"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Pencil className="h-3.5 w-3.5" />
                Rename in Console
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </Button>
          )}
        </div>
      )}

      <section
        aria-label="Key statistics"
        className="grid grid-cols-2 lg:grid-cols-4 gap-3"
      >
        <StatCard
          label="This month"
          value={formatUsd(key.stats.monthToDateCostCents)}
          hint={`of ${formatUsd(key.monthlyBudgetCents)} budget`}
          icon={<Wallet className="h-3.5 w-3.5" />}
          accent
        />
        <StatCard
          label="Total spend"
          value={formatUsd(key.stats.totalCostCents)}
          hint={`${formatTokens(key.stats.totalTokens)} tokens`}
          icon={<DollarSign className="h-3.5 w-3.5" />}
        />
        <StatCard
          label="On-purpose"
          value={trackingActive && key.stats.totalCostCents > 0 ? `${key.stats.onPurposePct.toFixed(0)}%` : "—"}
          hint={
            trackingActive && key.stats.totalCostCents > 0
              ? `${key.stats.offPurposePct.toFixed(0)}% off-purpose`
              : key.purposeClarity !== "clear"
                ? "rename to enable"
                : !key.encryptedKey
                  ? "enable proxy to track"
                  : "no requests yet"
          }
          icon={<Target className="h-3.5 w-3.5" />}
        />
        <StatCard
          label="Requests"
          value={key.stats.requestCount}
          hint={key.stats.lastRequestAt ? "last few logged" : "no requests yet"}
          icon={<Hash className="h-3.5 w-3.5" />}
        />
      </section>

      <section>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between gap-2">
              <span>Monthly budget</span>
              <span className="text-[10.5px] uppercase tracking-wider text-[var(--color-fg-subtle)]">
                Cycle resets {nextMonthLabel()}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <BudgetBar
              showLabels
              size="lg"
              spentCents={key.stats.monthToDateCostCents}
              budgetCents={key.monthlyBudgetCents}
            />
            {key.stats.monthToDateCostCents >= key.monthlyBudgetCents && (
              <p
                role="status"
                className="mt-3 text-xs text-[var(--color-danger)] flex items-start gap-1.5"
              >
                <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                This key has used its entire {formatUsd(key.monthlyBudgetCents)} monthly budget. The proxy still forwards requests — this is a soft limit.
              </p>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Daily spend</CardTitle>
          </CardHeader>
          <CardContent>
            <DailyChart data={series} />
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Purpose breakdown</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {trackingActive && key.stats.totalCostCents > 0 ? (
              <>
                <div className="flex items-baseline gap-2">
                  <p className="text-3xl font-semibold tracking-tight">
                    {key.stats.onPurposePct.toFixed(0)}%
                  </p>
                  <p className="text-sm text-[var(--color-fg-muted)]">
                    of spend is on-purpose
                  </p>
                </div>
                <PurposeBar
                  size="lg"
                  showLegend
                  onPct={key.stats.onPurposePct}
                  offPct={key.stats.offPurposePct}
                  pendingPct={key.stats.pendingPct}
                />
                <ul className="text-xs text-[var(--color-fg-muted)] space-y-1.5 pt-2 border-t border-[var(--color-border)]">
                  <li className="flex justify-between">
                    <span>On-purpose</span>
                    <span className="font-mono tabular-nums">
                      {formatUsd(key.stats.onPurposeCostCents)}
                    </span>
                  </li>
                  <li className="flex justify-between">
                    <span>Off-purpose</span>
                    <span className="font-mono tabular-nums">
                      {formatUsd(key.stats.offPurposeCostCents)}
                    </span>
                  </li>
                  <li className="flex justify-between">
                    <span>Pending</span>
                    <span className="font-mono tabular-nums">
                      {formatUsd(key.stats.pendingCostCents)}
                    </span>
                  </li>
                </ul>
              </>
            ) : (
              <div className="text-sm text-[var(--color-fg-muted)] py-4">
                {key.purposeClarity !== "clear"
                  ? "Purpose tracking is disabled because the key name doesn't describe a specific purpose."
                  : !key.encryptedKey
                    ? "Enable proxy on this key to start classifying requests as on-purpose or off-purpose."
                    : "No proxied requests yet."}
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <section>
        <Card>
          <CardHeader>
            <CardTitle>Recent requests</CardTitle>
          </CardHeader>
          <CardContent>
            <RequestsTable rows={recent} />
            {recent.length > 0 && (
              <p className="pt-3 text-[11px] text-[var(--color-fg-subtle)]">
                Showing the most recent {recent.length} proxied requests.
              </p>
            )}
          </CardContent>
        </Card>
      </section>

      <section>
        <Card>
          <CardHeader>
            <CardTitle>Controls</CardTitle>
          </CardHeader>
          <CardContent>
            <KeyControls
              id={key.id}
              status={key.status}
              name={key.name}
              isManual={isManual}
              monthlyBudgetCents={key.monthlyBudgetCents}
            />
          </CardContent>
        </Card>
      </section>

      {key.encryptedKey && (
        <section>
          <Card>
            <CardHeader>
              <CardTitle>How to use this key&apos;s proxy</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-[var(--color-fg-muted)]">
                Point any Anthropic SDK at Keymaster and use the proxy token below instead of the raw API key.
              </p>
              <pre className="overflow-x-auto rounded-md bg-[var(--color-bg)] border border-[var(--color-border)] p-3 text-[12px] font-mono leading-relaxed whitespace-pre-wrap break-all sm:break-normal">
{`# ENV
ANTHROPIC_BASE_URL=http://localhost:4002/api/proxy
ANTHROPIC_API_KEY=${key.proxyToken}`}
              </pre>
            </CardContent>
          </Card>
        </section>
      )}
    </div>
  );
}

function nextMonthLabel() {
  const now = new Date();
  const next = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)
  );
  return next.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}
