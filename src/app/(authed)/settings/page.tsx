import Link from "next/link";
import { redirect } from "next/navigation";
import { CheckCircle2, ExternalLink, Copy } from "lucide-react";
import { env } from "@/lib/env";
import { getCurrentUser } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CodeBlock } from "@/components/code-block";
import { getActiveAccount } from "@/lib/accounts";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const me = await getCurrentUser();
  if (!me) redirect("/login");
  if (me.role !== "admin") redirect("/me");

  const account = await getActiveAccount();
  const classifierModel = env().CLASSIFIER_MODEL;

  return (
    <div className="flex flex-col gap-6 sm:gap-8">
      <header>
        <p className="text-xs uppercase tracking-wider text-[var(--color-fg-subtle)]">
          Configuration
        </p>
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight mt-1">
          Settings
        </h1>
        <p className="text-sm text-[var(--color-fg-muted)] mt-2 max-w-2xl">
          Status of the connected account, and how to use Keymaster&apos;s proxy from your apps.
        </p>
      </header>

      <section aria-label="Connection">
        <Card>
          <CardHeader>
            <CardTitle>Connected account</CardTitle>
          </CardHeader>
          <CardContent>
            {account ? (
              <ul className="flex flex-col gap-3">
                <Row
                  label="Organization"
                  value={account.orgName}
                  detail={`Org ID: ${account.orgId}`}
                />
                <Row
                  label="Admin key"
                  value={
                    <span className="font-mono">
                      {account.partialAdminKeyHint}
                    </span>
                  }
                  detail="Encrypted at rest with AES-256-GCM."
                />
                <Row
                  label="Connected"
                  value={new Date(account.connectedAt).toLocaleString()}
                  detail={
                    account.lastSyncedAt
                      ? `Last synced ${new Date(account.lastSyncedAt).toLocaleString()}`
                      : "Not yet synced"
                  }
                />
              </ul>
            ) : (
              <p className="text-sm text-[var(--color-fg-muted)]">
                No account connected. <Link href="/connect" className="underline">Connect one</Link>.
              </p>
            )}
          </CardContent>
        </Card>
      </section>

      <section>
        <Card>
          <CardHeader>
            <CardTitle>Classifier</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-[var(--color-fg-muted)] space-y-2">
            <p>
              Proxied requests are classified as on-purpose / off-purpose using{" "}
              <code className="font-mono text-[var(--color-fg)]">
                {classifierModel}
              </code>
              . Override with the <code className="font-mono">CLASSIFIER_MODEL</code> env var.
            </p>
            <p>
              Purpose clarity (whether a key&apos;s name is specific enough to classify against) is determined heuristically at sync time — no LLM call required.
            </p>
          </CardContent>
        </Card>
      </section>

      <section>
        <Card>
          <CardHeader>
            <CardTitle>Using the proxy</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <p className="text-[var(--color-fg-muted)]">
              Each key with proxy enabled gets a unique <em>proxy token</em>. Point your apps at the local proxy and use that token in place of the raw API key.
            </p>
            <div className="grid gap-3">
              <p className="text-xs uppercase tracking-wider text-[var(--color-fg-subtle)]">
                Anthropic SDK (Python / Node)
              </p>
              <CodeBlock>
{`# Environment
export ANTHROPIC_BASE_URL=http://localhost:4002/api/proxy
export ANTHROPIC_API_KEY=prx-…   # the proxy token from the key's detail page`}
              </CodeBlock>
            </div>
            <div className="grid gap-3">
              <p className="text-xs uppercase tracking-wider text-[var(--color-fg-subtle)]">
                cURL
              </p>
              <CodeBlock>
{`curl http://localhost:4002/api/proxy/v1/messages \\
  -H "x-api-key: prx-…" \\
  -H "anthropic-version: 2023-06-01" \\
  -H "content-type: application/json" \\
  -d '{"model":"claude-sonnet-4-6","max_tokens":256,"messages":[{"role":"user","content":"hi"}]}'`}
              </CodeBlock>
            </div>
            <p className="text-[11px] text-[var(--color-fg-subtle)] flex items-start gap-1.5">
              <Copy className="h-3 w-3 mt-0.5" />
              Streaming (SSE) is supported transparently.
            </p>
          </CardContent>
        </Card>
      </section>

      <section>
        <Card>
          <CardHeader>
            <CardTitle>Why can&apos;t Keymaster auto-discover key secrets?</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-[var(--color-fg-muted)] space-y-3">
            <p>
              Anthropic&apos;s Admin API returns key <em>metadata</em> (id, name, last 4 chars) but not the secret value, which is shown once at creation and never again. So the app can list every key in your org and show usage from the Admin API, but it can&apos;t proxy a request without the key&apos;s secret.
            </p>
            <p>
              When you enable proxying on a key, you paste the secret once (created in Console); it&apos;s encrypted with your local encryption key and reused for every forwarded request after that. Keys you never enroll show metadata-only.
            </p>
            <Button asChild variant="ghost" size="sm" className="w-fit">
              <a
                href="https://platform.claude.com/settings/keys"
                target="_blank"
                rel="noopener noreferrer"
              >
                Open Anthropic Console
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </Button>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function Row({
  label,
  value,
  detail,
}: {
  label: string;
  value: React.ReactNode;
  detail?: string;
}) {
  return (
    <li className="flex items-start gap-3">
      <CheckCircle2 className="h-4 w-4 mt-0.5 text-[var(--color-success)] shrink-0" aria-hidden />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] uppercase tracking-wider text-[var(--color-fg-subtle)]">
            {label}
          </span>
          <Badge tone="success">OK</Badge>
        </div>
        <p className="text-sm mt-0.5 truncate">{value}</p>
        {detail && (
          <p className="text-xs text-[var(--color-fg-muted)] mt-0.5">{detail}</p>
        )}
      </div>
    </li>
  );
}
