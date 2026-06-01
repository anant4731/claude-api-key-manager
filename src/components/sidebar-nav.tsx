"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  KeyRound,
  Settings,
  PlusCircle,
  User as UserIcon,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Item = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  match?: (path: string) => boolean;
  adminOnly?: boolean;
};

const ITEMS: Item[] = [
  {
    href: "/",
    label: "Dashboard",
    icon: LayoutDashboard,
    match: (p) => p === "/",
    adminOnly: true,
  },
  {
    href: "/me",
    label: "My stats",
    icon: UserIcon,
    match: (p) => p.startsWith("/me"),
  },
  {
    href: "/keys",
    label: "API keys",
    icon: KeyRound,
    match: (p) => p.startsWith("/keys"),
    adminOnly: true,
  },
  {
    href: "/admin/users",
    label: "Users",
    icon: Users,
    match: (p) => p.startsWith("/admin/users"),
    adminOnly: true,
  },
  {
    href: "/settings",
    label: "Settings",
    icon: Settings,
    match: (p) => p === "/settings",
    adminOnly: true,
  },
];

export function SidebarNav({
  role,
  onNavigate,
}: {
  role: "admin" | "user";
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const items = ITEMS.filter((i) => !i.adminOnly || role === "admin");
  return (
    <nav aria-label="Primary" className="flex flex-1 flex-col">
      <ul className="flex flex-col gap-0.5 px-2">
        {items.map((item) => {
          const Icon = item.icon;
          const active = item.match
            ? item.match(pathname)
            : pathname === item.href;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "group flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors min-h-[40px]",
                  active
                    ? "bg-[var(--color-surface-2)] text-[var(--color-fg)]"
                    : "text-[var(--color-fg-muted)] hover:bg-[var(--color-surface-2)]/60 hover:text-[var(--color-fg)]"
                )}
              >
                <Icon
                  className={cn(
                    "h-4 w-4 shrink-0",
                    active
                      ? "text-[var(--color-brand)]"
                      : "text-[var(--color-fg-subtle)] group-hover:text-[var(--color-fg-muted)]"
                  )}
                />
                <span className="truncate">{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>

      {role === "admin" && (
        <div className="mt-4 px-3">
          <Link
            href="/keys/new"
            onClick={onNavigate}
            className="flex items-center justify-center gap-2 rounded-md border border-dashed border-[var(--color-border-strong)] px-3 py-2 text-xs font-medium text-[var(--color-fg-muted)] hover:border-[var(--color-brand)] hover:text-[var(--color-brand)] transition-colors min-h-[40px]"
          >
            <PlusCircle className="h-3.5 w-3.5" />
            Add key
          </Link>
        </div>
      )}
    </nav>
  );
}
