"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  UserPlus,
  Trash2,
  ShieldCheck,
  User as UserIcon,
  KeyRound,
  X,
  ChevronDown,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { relativeTime } from "@/lib/utils";

export type AdminUserRow = {
  id: string;
  email: string;
  displayName: string;
  role: "admin" | "user";
  createdAt: string;
  lastLoginAt: string | null;
  assignedKeyIds: string[];
};

export type KeyChoice = {
  id: string;
  name: string;
  partialKeyHint: string;
};

export function UserManagement({
  initialUsers,
  keyChoices,
  currentUserId,
}: {
  initialUsers: AdminUserRow[];
  keyChoices: KeyChoice[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [users, setUsers] = useState<AdminUserRow[]>(initialUsers);
  const [pending, startTransition] = useTransition();

  function refresh() {
    startTransition(() => router.refresh());
  }

  async function createUser(payload: {
    email: string;
    password: string;
    displayName: string;
    role: "admin" | "user";
  }) {
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Could not create user.");
    refresh();
  }

  async function deleteUser(id: string) {
    const res = await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Could not delete user.");
    setUsers((rows) => rows.filter((u) => u.id !== id));
    refresh();
  }

  async function changeRole(id: string, role: "admin" | "user") {
    const res = await fetch(`/api/admin/users/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ role }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Could not change role.");
    setUsers((rows) =>
      rows.map((u) => (u.id === id ? { ...u, role } : u))
    );
    refresh();
  }

  async function assignKey(userId: string, apiKeyId: string) {
    const res = await fetch(`/api/admin/users/${userId}/assignments`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ apiKeyId }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Could not assign key.");
    setUsers((rows) =>
      rows.map((u) =>
        u.id === userId
          ? {
              ...u,
              assignedKeyIds: u.assignedKeyIds.includes(apiKeyId)
                ? u.assignedKeyIds
                : [...u.assignedKeyIds, apiKeyId],
            }
          : u
      )
    );
    refresh();
  }

  async function unassignKey(userId: string, apiKeyId: string) {
    const res = await fetch(`/api/admin/users/${userId}/assignments`, {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ apiKeyId }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Could not unassign key.");
    setUsers((rows) =>
      rows.map((u) =>
        u.id === userId
          ? {
              ...u,
              assignedKeyIds: u.assignedKeyIds.filter((k) => k !== apiKeyId),
            }
          : u
      )
    );
    refresh();
  }

  return (
    <div className="flex flex-col gap-6">
      <CreateUserCard onCreate={createUser} disabled={pending} />

      <Card>
        <CardHeader>
          <CardTitle>Users ({users.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {users.length === 0 ? (
            <p className="text-sm text-[var(--color-fg-subtle)] py-8 text-center">
              No users yet.
            </p>
          ) : (
            <ul className="divide-y divide-[var(--color-border)]">
              {users.map((u) => (
                <li key={u.id} className="p-4 sm:p-5">
                  <UserRow
                    user={u}
                    keyChoices={keyChoices}
                    isSelf={u.id === currentUserId}
                    onDelete={() => deleteUser(u.id)}
                    onRole={(r) => changeRole(u.id, r)}
                    onAssign={(k) => assignKey(u.id, k)}
                    onUnassign={(k) => unassignKey(u.id, k)}
                  />
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function CreateUserCard({
  onCreate,
  disabled,
}: {
  onCreate: (input: {
    email: string;
    password: string;
    displayName: string;
    role: "admin" | "user";
  }) => Promise<void>;
  disabled: boolean;
}) {
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"admin" | "user">("user");
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setMsg(null);
    if (password.length < 8) {
      setErr("Password must be at least 8 characters.");
      return;
    }
    setBusy(true);
    try {
      await onCreate({ email, displayName, password, role });
      setMsg(`Created ${email}. Share their password securely.`);
      setEmail("");
      setDisplayName("");
      setPassword("");
      setRole("user");
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserPlus className="h-4 w-4 text-[var(--color-fg-subtle)]" />
          Create user
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2" noValidate>
          <div className="flex flex-col gap-2">
            <Label htmlFor="new-email">Email</Label>
            <Input
              id="new-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              spellCheck={false}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="new-display">Display name (optional)</Label>
            <Input
              id="new-display"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="new-password">Temporary password</Label>
            <Input
              id="new-password"
              type="text"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <p className="text-[11px] text-[var(--color-fg-subtle)]">
              Min 8 chars. They can change it from their page.
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="new-role">Role</Label>
            <div className="relative">
              <select
                id="new-role"
                value={role}
                onChange={(e) => setRole(e.target.value as "admin" | "user")}
                className="appearance-none w-full h-9 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand)]"
              >
                <option value="user">User — sees only assigned keys</option>
                <option value="admin">Admin — full control</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--color-fg-subtle)]" />
            </div>
          </div>
          <div className="sm:col-span-2 flex flex-col gap-2">
            {err && (
              <p role="alert" className="text-sm text-[var(--color-danger)]">
                {err}
              </p>
            )}
            {msg && (
              <p role="status" className="text-sm text-[var(--color-success)]">
                {msg}
              </p>
            )}
            <Button
              type="submit"
              disabled={busy || disabled || !email || !password}
              className="self-start"
            >
              {busy ? "Creating…" : "Create user"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function UserRow({
  user,
  keyChoices,
  isSelf,
  onDelete,
  onRole,
  onAssign,
  onUnassign,
}: {
  user: AdminUserRow;
  keyChoices: KeyChoice[];
  isSelf: boolean;
  onDelete: () => Promise<void>;
  onRole: (r: "admin" | "user") => Promise<void>;
  onAssign: (k: string) => Promise<void>;
  onUnassign: (k: string) => Promise<void>;
}) {
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  const assignedSet = new Set(user.assignedKeyIds);
  const available = keyChoices.filter((k) => !assignedSet.has(k.id));

  async function run(fn: () => Promise<void>) {
    setErr(null);
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium truncate">
              {user.displayName?.trim() || user.email}
            </span>
            <Badge tone={user.role === "admin" ? "brand" : "neutral"}>
              {user.role === "admin" ? (
                <ShieldCheck className="h-3 w-3" />
              ) : (
                <UserIcon className="h-3 w-3" />
              )}
              {user.role}
            </Badge>
            {isSelf && <Badge tone="neutral">You</Badge>}
          </div>
          <p className="text-[12px] text-[var(--color-fg-muted)] font-mono mt-0.5">
            {user.email}
          </p>
          <p className="text-[11px] text-[var(--color-fg-subtle)] mt-0.5">
            Created {relativeTime(user.createdAt)} ·{" "}
            {user.lastLoginAt
              ? `last sign-in ${relativeTime(user.lastLoginAt)}`
              : "never signed in"}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {!isSelf && (
            <Button
              variant="secondary"
              size="sm"
              disabled={busy}
              onClick={() =>
                run(() => onRole(user.role === "admin" ? "user" : "admin"))
              }
            >
              {user.role === "admin" ? "Demote to user" : "Promote to admin"}
            </Button>
          )}
          {!isSelf && (
            <Button
              variant="ghost"
              size="sm"
              disabled={busy}
              onClick={() => {
                if (!confirm(`Delete ${user.email}? This can't be undone.`))
                  return;
                run(onDelete);
              }}
              className="text-[var(--color-danger)] hover:bg-[color-mix(in_oklab,var(--color-danger)_10%,transparent)]"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </Button>
          )}
        </div>
      </div>

      <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)]/40 p-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <p className="text-[10.5px] uppercase tracking-wider text-[var(--color-fg-subtle)] flex items-center gap-1.5">
            <KeyRound className="h-3 w-3" />
            Assigned API keys ({user.assignedKeyIds.length})
          </p>
          {user.role === "admin" && (
            <p className="text-[11px] text-[var(--color-fg-subtle)] italic">
              Admins see all keys regardless of assignment.
            </p>
          )}
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {user.assignedKeyIds.length === 0 && (
            <p className="text-[12px] text-[var(--color-fg-subtle)]">
              No keys assigned yet.
            </p>
          )}
          {user.assignedKeyIds.map((id) => {
            const k = keyChoices.find((kk) => kk.id === id);
            return (
              <span
                key={id}
                className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-surface-2)] border border-[var(--color-border)] px-2 py-0.5 text-[11px]"
              >
                <span className="truncate max-w-[200px]">
                  {k?.name ?? id}
                </span>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => run(() => onUnassign(id))}
                  className="text-[var(--color-fg-subtle)] hover:text-[var(--color-danger)] focus:outline-none"
                  aria-label="Unassign"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            );
          })}
        </div>

        {available.length > 0 && (
          <div className="mt-3">
            {!pickerOpen ? (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setPickerOpen(true)}
              >
                <UserPlus className="h-3.5 w-3.5" />
                Assign a key
              </Button>
            ) : (
              <div className="flex items-center gap-2 flex-wrap">
                <div className="relative">
                  <select
                    aria-label="Choose a key to assign"
                    className="appearance-none h-8 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2 pr-7 text-xs focus:outline-none focus:ring-2 focus:ring-[var(--color-brand)]"
                    onChange={(e) => {
                      const v = e.target.value;
                      if (!v) return;
                      e.target.value = "";
                      run(() => onAssign(v)).then(() => setPickerOpen(false));
                    }}
                    defaultValue=""
                  >
                    <option value="" disabled>
                      Select a key…
                    </option>
                    {available.map((k) => (
                      <option key={k.id} value={k.id}>
                        {k.name} ({k.partialKeyHint})
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-[var(--color-fg-subtle)]" />
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setPickerOpen(false)}
                >
                  Cancel
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {err && (
        <p role="alert" className="text-xs text-[var(--color-danger)]">
          {err}
        </p>
      )}
    </div>
  );
}
