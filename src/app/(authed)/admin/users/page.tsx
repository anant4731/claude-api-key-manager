import { redirect } from "next/navigation";
import { Users } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { listUsers, listKeyIdsForUser } from "@/lib/users";
import { listKeys } from "@/lib/keys";
import { UserManagement, type AdminUserRow, type KeyChoice } from "@/components/user-management";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const me = await getCurrentUser();
  if (!me) redirect("/login");
  if (me.role !== "admin") redirect("/me");

  const [users, allKeys] = await Promise.all([listUsers(), safeKeys()]);

  const rows: AdminUserRow[] = await Promise.all(
    users.map(async (u) => ({
      id: u.id,
      email: u.email,
      displayName: u.displayName,
      role: (u.role === "admin" ? "admin" : "user") as "admin" | "user",
      createdAt: u.createdAt,
      lastLoginAt: u.lastLoginAt,
      assignedKeyIds: await listKeyIdsForUser(u.id),
    }))
  );

  const keyChoices: KeyChoice[] = allKeys.map((k) => ({
    id: k.id,
    name: k.name,
    partialKeyHint: k.partialKeyHint || "—",
  }));

  return (
    <div className="flex flex-col gap-6 sm:gap-8">
      <header>
        <p className="text-xs uppercase tracking-wider text-[var(--color-fg-subtle)]">
          Access control
        </p>
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight mt-1 flex items-center gap-2">
          <Users className="h-6 w-6 text-[var(--color-fg-subtle)]" />
          Users
        </h1>
        <p className="text-sm text-[var(--color-fg-muted)] mt-2 max-w-2xl">
          Create admins and users, assign API keys to users so they can view stats scoped to their work. Admins see everything; users see only the keys assigned to them.
        </p>
      </header>

      <UserManagement
        initialUsers={rows}
        keyChoices={keyChoices}
        currentUserId={me.id}
      />
    </div>
  );
}

async function safeKeys() {
  try {
    return await listKeys();
  } catch (e) {
    console.error("listKeys failed:", e);
    return [];
  }
}
