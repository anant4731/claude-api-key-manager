import Link from "next/link";
import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Brand } from "@/components/brand";
import { LoginForm } from "@/components/login-form";
import { getCurrentUser } from "@/lib/auth";
import { hasAnyUser } from "@/lib/users";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const sp = await searchParams;
  if (!(await hasAnyUser())) redirect("/setup");
  const me = await getCurrentUser();
  if (me) redirect(sp.next || "/");

  return (
    <div className="min-h-screen flex flex-col spotlight">
      <header className="px-4 sm:px-8 pt-6 pb-4">
        <Brand />
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md flex flex-col gap-6">
          <div className="text-center">
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
              Sign in
            </h1>
            <p className="mt-2 text-sm text-[var(--color-fg-muted)]">
              Welcome back. Sign in to view your dashboard.
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Email &amp; password</CardTitle>
            </CardHeader>
            <CardContent>
              <LoginForm next={sp.next} />
            </CardContent>
          </Card>

          <p className="flex items-start gap-2 text-[11px] text-[var(--color-fg-subtle)] px-1">
            <ShieldCheck className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            <span>
              Passwords are hashed with scrypt. Session cookies are httpOnly and stay on this machine.
            </span>
          </p>

          <p className="text-center text-xs text-[var(--color-fg-muted)]">
            Don&apos;t have an account?{" "}
            <Link
              href="/"
              className="underline underline-offset-2 hover:text-[var(--color-fg)]"
            >
              Ask an admin to create one
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
