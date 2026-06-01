import { Brand } from "@/components/brand";
import { SidebarNav } from "@/components/sidebar-nav";
import { MobileNav } from "@/components/mobile-nav";
import { AccountMenu } from "@/components/account-menu";
import type { Account, User } from "@/lib/db/schema";

export function AppShell({
  account,
  user,
  children,
}: {
  account: Account | null;
  user: User;
  children: React.ReactNode;
}) {
  const summary = account
    ? {
        orgName: account.orgName,
        partialAdminKeyHint: account.partialAdminKeyHint,
        lastSyncedAt: account.lastSyncedAt,
      }
    : null;

  const userSummary = {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    role: user.role as "admin" | "user",
  };

  return (
    <div className="min-h-screen flex flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[60] focus:rounded-md focus:bg-[var(--color-surface-2)] focus:px-3 focus:py-2 focus:text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand)]"
      >
        Skip to content
      </a>

      <div className="flex flex-1">
        <aside
          aria-label="Sidebar"
          className="hidden md:flex md:w-60 lg:w-64 flex-col border-r border-[var(--color-border)] bg-[var(--color-surface)]/40 backdrop-blur sticky top-0 h-screen"
        >
          <div className="px-4 pt-5 pb-4">
            <Brand />
          </div>
          <SidebarNav role={userSummary.role} />
          <div className="mt-auto p-4 text-[10.5px] text-[var(--color-fg-subtle)] leading-relaxed">
            {account ? (
              <>
                <p className="truncate font-medium text-[var(--color-fg-muted)]">
                  {account.orgName}
                </p>
                <p className="mt-1">
                  All data stays on this machine. Keys encrypted at rest.
                </p>
              </>
            ) : (
              <p>
                Manual mode — keys you add stay on this machine, encrypted at rest.
              </p>
            )}
          </div>
        </aside>

        <div className="flex-1 flex flex-col min-w-0">
          <header className="sticky top-0 z-30 glass border-b border-[var(--color-border)] h-14 flex items-center px-3 sm:px-6 gap-2">
            <MobileNav role={userSummary.role} />
            <div className="md:hidden">
              <Brand size="sm" />
            </div>
            <div className="ml-auto flex items-center gap-2">
              <AccountMenu account={summary} user={userSummary} />
            </div>
          </header>

          <main
            id="main"
            tabIndex={-1}
            className="flex-1 spotlight focus:outline-none"
          >
            <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 py-6 sm:py-10">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
