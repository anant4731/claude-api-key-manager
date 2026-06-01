import { redirect } from "next/navigation";
import { Sparkles, ShieldCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Brand } from "@/components/brand";
import { SetupForm } from "@/components/setup-form";
import { hasAnyUser } from "@/lib/users";

export const dynamic = "force-dynamic";

export default async function SetupPage() {
  if (await hasAnyUser()) redirect("/login");

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
              First-run setup
            </span>
            <h1 className="mt-3 text-2xl sm:text-3xl font-semibold tracking-tight">
              Create the first admin
            </h1>
            <p className="mt-2 text-sm text-[var(--color-fg-muted)]">
              The first user becomes an admin and can manage everything: keys, budgets, proxy enrollment, and other users.
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Admin account</CardTitle>
            </CardHeader>
            <CardContent>
              <SetupForm />
            </CardContent>
          </Card>

          <p className="flex items-start gap-2 text-[11px] text-[var(--color-fg-subtle)] px-1">
            <ShieldCheck className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            <span>
              Your credentials are hashed with scrypt and stored locally in SQLite. Nothing leaves this machine.
            </span>
          </p>
        </div>
      </main>
    </div>
  );
}
