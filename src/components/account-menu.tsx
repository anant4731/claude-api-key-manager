"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Building2,
  ChevronDown,
  LogOut,
  Plug,
  RefreshCw,
  Repeat,
  User as UserIcon,
  Users,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type AccountSummary = {
  orgName: string;
  partialAdminKeyHint: string;
  lastSyncedAt: string | null;
};

export type UserSummary = {
  id: string;
  email: string;
  displayName: string;
  role: "admin" | "user";
};

export function AccountMenu({
  account,
  user,
}: {
  account: AccountSummary | null;
  user: UserSummary;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [syncing, setSyncing] = useState(false);

  async function sync() {
    if (user.role !== "admin") return;
    setSyncing(true);
    try {
      await fetch("/api/sync", { method: "POST" });
    } finally {
      setSyncing(false);
      startTransition(() => router.refresh());
    }
  }

  async function disconnect() {
    if (user.role !== "admin") return;
    await fetch("/api/account", { method: "DELETE" });
    router.push("/");
    router.refresh();
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  const userLabel = user.displayName?.trim() || user.email;
  const initials =
    (user.displayName?.trim() || user.email)
      .split(/[\s@]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? "")
      .join("") || "·";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="secondary"
          size="sm"
          aria-label={`Account menu for ${userLabel}`}
          className="gap-2"
        >
          <span
            aria-hidden
            className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[color-mix(in_oklab,var(--color-brand)_25%,transparent)] text-[var(--color-brand)] text-[10px] font-semibold"
          >
            {initials}
          </span>
          <span className="hidden sm:inline max-w-[160px] truncate">
            {userLabel}
          </span>
          <ChevronDown className="h-3.5 w-3.5 text-[var(--color-fg-subtle)]" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel>Signed in</DropdownMenuLabel>
        <div className="px-2 pb-2 pt-1">
          <p className="text-sm font-medium truncate">{userLabel}</p>
          <p className="font-mono text-[11px] text-[var(--color-fg-subtle)] truncate">
            {user.email}
          </p>
          <p className="text-[11px] mt-1 inline-flex items-center gap-1 text-[var(--color-fg-muted)]">
            {user.role === "admin" ? (
              <>
                <ShieldCheck className="h-3 w-3" />
                Admin
              </>
            ) : (
              <>
                <UserIcon className="h-3 w-3" />
                User
              </>
            )}
          </p>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/me">
            <UserIcon className="h-3.5 w-3.5" />
            My stats
          </Link>
        </DropdownMenuItem>
        {user.role === "admin" && (
          <DropdownMenuItem asChild>
            <Link href="/admin/users">
              <Users className="h-3.5 w-3.5" />
              Manage users
            </Link>
          </DropdownMenuItem>
        )}

        {user.role === "admin" && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>
              {account ? "Connected account" : "Anthropic"}
            </DropdownMenuLabel>
            <div className="px-2 pb-2 pt-1">
              {account ? (
                <>
                  <p className="text-sm font-medium truncate">
                    {account.orgName}
                  </p>
                  <p className="font-mono text-[11px] text-[var(--color-fg-subtle)] truncate">
                    {account.partialAdminKeyHint}
                  </p>
                  {account.lastSyncedAt && (
                    <p className="text-[11px] text-[var(--color-fg-subtle)] mt-0.5">
                      Last synced{" "}
                      {new Date(account.lastSyncedAt).toLocaleString()}
                    </p>
                  )}
                </>
              ) : (
                <p className="text-[12px] text-[var(--color-fg-subtle)]">
                  No Anthropic account connected.
                </p>
              )}
            </div>
            {account ? (
              <>
                <DropdownMenuItem
                  onSelect={(e) => {
                    e.preventDefault();
                    sync();
                  }}
                  disabled={syncing || pending}
                >
                  <RefreshCw
                    className={`h-3.5 w-3.5 ${syncing ? "animate-spin" : ""}`}
                  />
                  {syncing ? "Syncing…" : "Sync now"}
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/connect?switch=1">
                    <Repeat className="h-3.5 w-3.5" />
                    Switch account
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/settings">
                    <Building2 className="h-3.5 w-3.5" />
                    Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem
                  danger
                  onSelect={(e) => {
                    e.preventDefault();
                    disconnect();
                  }}
                >
                  <Plug className="h-3.5 w-3.5" />
                  Disconnect account
                </DropdownMenuItem>
              </>
            ) : (
              <DropdownMenuItem asChild>
                <Link href="/connect">
                  <Plug className="h-3.5 w-3.5" />
                  Connect Anthropic account
                </Link>
              </DropdownMenuItem>
            )}
          </>
        )}

        <DropdownMenuSeparator />
        <DropdownMenuItem
          danger
          onSelect={(e) => {
            e.preventDefault();
            logout();
          }}
        >
          <LogOut className="h-3.5 w-3.5" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
