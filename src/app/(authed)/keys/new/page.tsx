import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft, ExternalLink, KeyRound } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ManualKeyForm } from "@/components/manual-key-form";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function NewKeyPage() {
  const me = await getCurrentUser();
  if (!me) redirect("/login");
  if (me.role !== "admin") redirect("/me");
  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <nav aria-label="Breadcrumb" className="text-xs text-[var(--color-fg-muted)]">
        <Link
          href="/keys"
          className="inline-flex items-center hover:text-[var(--color-fg)] focus:outline-none focus-visible:underline"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          All keys
        </Link>
      </nav>

      <header>
        <p className="text-xs uppercase tracking-wider text-[var(--color-fg-subtle)]">
          Manual add
        </p>
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight mt-1">
          Add an API key
        </h1>
        <p className="text-sm text-[var(--color-fg-muted)] mt-2 max-w-prose">
          Use this when you can&apos;t auto-sync — e.g. on an individual Anthropic account where the Admin API isn&apos;t available. The name you set here is treated as the key&apos;s purpose for classification.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-[color-mix(in_oklab,var(--color-brand)_25%,transparent)] text-[var(--color-brand)] text-xs">
              1
            </span>
            Create a key in the Anthropic Console
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p className="text-[var(--color-fg-muted)]">
            Open the keys page in Console, generate a new key, and copy the secret value (only shown once). Give the key a name that describes its purpose.
          </p>
          <Button asChild variant="secondary" size="sm">
            <a
              href="https://platform.claude.com/settings/keys"
              target="_blank"
              rel="noopener noreferrer"
            >
              <KeyRound className="h-3.5 w-3.5" />
              Open Console
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-[color-mix(in_oklab,var(--color-brand)_25%,transparent)] text-[var(--color-brand)] text-xs">
              2
            </span>
            Paste it here
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ManualKeyForm />
        </CardContent>
      </Card>
    </div>
  );
}
