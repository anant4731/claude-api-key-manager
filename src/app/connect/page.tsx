import Link from "next/link";
import { redirect } from "next/navigation";
import { ExternalLink, ShieldCheck, Sparkles, AlertTriangle, Building2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Brand } from "@/components/brand";
import { ConnectForm } from "@/components/connect-form";
import { getActiveAccount } from "@/lib/accounts";
import { getCurrentUser } from "@/lib/auth";
import { hasAnyUser } from "@/lib/users";

export const dynamic = "force-dynamic";

export default async function ConnectPage({
  searchParams,
}: {
  searchParams: Promise<{ switch?: string }>;
}) {
  const sp = await searchParams;
  if (!(await hasAnyUser())) redirect("/setup");
  const me = await getCurrentUser();
  if (!me) redirect("/login?next=/connect");
  if (me.role !== "admin") redirect("/me");

  const account = await getActiveAccount();
  if (account && !sp.switch) redirect("/");

  return (
    <div className="min-h-screen flex flex-col spotlight">
      <header className="px-4 sm:px-8 pt-6 pb-4">
        <Brand />
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md flex flex-col gap-6">
          <div className="text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1 text-[10.5px] uppercase tracking-wider text-[var(--color-fg-muted)]">
              <Sparkles className="h-3 w-3" />
              {account ? "Switch account" : "Welcome"}
            </span>
            <h1 className="mt-3 text-2xl sm:text-3xl font-semibold tracking-tight">
              Connect your Anthropic account
            </h1>
            <p className="mt-2 text-sm text-[var(--color-fg-muted)]">
              Paste an Admin API key from the Anthropic Console. We&apos;ll sync your API keys, usage, and purpose alignment automatically.
            </p>
          </div>

          <div
            role="note"
            className="flex items-start gap-2.5 rounded-[var(--radius-card)] border border-[color-mix(in_oklab,var(--color-warning)_30%,transparent)] bg-[color-mix(in_oklab,var(--color-warning)_8%,transparent)] p-3 text-[12.5px]"
          >
            <AlertTriangle
              className="h-4 w-4 mt-0.5 text-[var(--color-warning)] shrink-0"
              aria-hidden
            />
            <div>
              <p className="font-medium">Your account must be an organization</p>
              <p className="text-[var(--color-fg-muted)] mt-0.5">
                The Admin API is only available for organizations, not individual accounts. If <code className="font-mono">platform.claude.com/settings/admin-keys</code> shows &ldquo;Page not found&rdquo; for you, it&apos;s because your account is still an individual account.
              </p>
              <Button asChild variant="ghost" size="sm" className="mt-1.5 h-7 px-2 -ml-1">
                <a
                  href="https://console.anthropic.com/create"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Building2 className="h-3 w-3" />
                  Create an organization
                  <ExternalLink className="h-3 w-3" />
                </a>
              </Button>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-[var(--color-fg)] text-base">
                <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-[color-mix(in_oklab,var(--color-brand)_25%,transparent)] text-[var(--color-brand)] text-xs">
                  1
                </span>
                Generate an Admin API key
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-[var(--color-fg-muted)]">
                In the Claude Console, create a new admin key. It starts with <code className="font-mono">sk-ant-admin</code> and is shown only once.
              </p>
              <Button asChild variant="secondary" size="sm">
                <a
                  href="https://platform.claude.com/settings/admin-keys"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Open admin keys page
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-[var(--color-fg)] text-base">
                <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-[color-mix(in_oklab,var(--color-brand)_25%,transparent)] text-[var(--color-brand)] text-xs">
                  2
                </span>
                Paste it here
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ConnectForm />
            </CardContent>
          </Card>

          <p className="flex items-start gap-2 text-[11px] text-[var(--color-fg-subtle)] px-1">
            <ShieldCheck className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            <span>
              Stored locally on this machine, encrypted with AES-256-GCM. Nothing leaves your computer except the calls the Admin API forwards to Anthropic.
            </span>
          </p>

          {account && (
            <p className="text-center text-xs text-[var(--color-fg-muted)]">
              Currently connected to {account.orgName}.{" "}
              <Link
                href="/"
                className="underline underline-offset-2 hover:text-[var(--color-fg)]"
              >
                Keep this account
              </Link>
            </p>
          )}
        </div>
      </main>
    </div>
  );
}
