"use client";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Check, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { analyzeNameClarity } from "@/lib/purpose-clarity";

export function KeyControls({
  id,
  status,
  name,
  isManual,
  monthlyBudgetCents,
}: {
  id: string;
  status: string;
  name: string;
  isManual: boolean;
  monthlyBudgetCents: number;
}) {
  const router = useRouter();
  const [s, setS] = useState<string>(status);
  const [n, setN] = useState(name);
  const [budgetDollars, setBudgetDollars] = useState(
    (monthlyBudgetCents / 100).toFixed(2)
  );
  const [err, setErr] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [submitting, setSubmitting] = useState(false);
  const [savedName, setSavedName] = useState(name);
  const [savedBudgetCents, setSavedBudgetCents] = useState(monthlyBudgetCents);

  const parsedBudgetCents = useMemo(() => {
    const n = parseFloat(budgetDollars);
    if (!Number.isFinite(n)) return null;
    return Math.round(n * 100);
  }, [budgetDollars]);
  const budgetInvalid =
    parsedBudgetCents === null || parsedBudgetCents < 1;
  const budgetDirty =
    parsedBudgetCents !== null && parsedBudgetCents !== savedBudgetCents;

  const clarityPreview = useMemo(
    () => (n.trim() && n !== savedName ? analyzeNameClarity(n) : null),
    [n, savedName]
  );

  async function saveStatus(next: "active" | "inactive") {
    if (next === s) return;
    setErr(null);
    setSubmitting(true);
    try {
      const res = await fetch(`/api/keys/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setErr(j.error ?? "Update failed.");
        return;
      }
      setS(next);
      startTransition(() => router.refresh());
    } finally {
      setSubmitting(false);
    }
  }

  async function saveName(e: React.FormEvent) {
    e.preventDefault();
    if (n.trim() === savedName) return;
    setErr(null);
    setSubmitting(true);
    try {
      const res = await fetch(`/api/keys/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: n.trim() }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setErr(j.error ?? "Rename failed.");
        return;
      }
      setSavedName(n.trim());
      startTransition(() => router.refresh());
    } finally {
      setSubmitting(false);
    }
  }

  async function saveBudget(e: React.FormEvent) {
    e.preventDefault();
    if (budgetInvalid || !budgetDirty) return;
    setErr(null);
    setSubmitting(true);
    try {
      const res = await fetch(`/api/keys/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ monthlyBudgetCents: parsedBudgetCents }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setErr(j.error ?? "Update failed.");
        return;
      }
      setSavedBudgetCents(parsedBudgetCents!);
      startTransition(() => router.refresh());
    } finally {
      setSubmitting(false);
    }
  }

  async function destroy() {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/keys/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setErr(j.error ?? "Delete failed.");
        return;
      }
      router.push("/keys");
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  const busy = submitting || pending;

  return (
    <div className="flex flex-col gap-5">
      {isManual && (
        <form onSubmit={saveName} className="flex flex-col gap-2">
          <Label htmlFor="key-rename">Name (purpose)</Label>
          <div className="flex gap-2">
            <Input
              id="key-rename"
              value={n}
              onChange={(e) => setN(e.target.value)}
              maxLength={160}
              aria-describedby="key-rename-clarity"
            />
            <Button
              type="submit"
              size="sm"
              disabled={!n.trim() || n.trim() === savedName || busy}
            >
              Save
            </Button>
          </div>
          {clarityPreview && (
            <p
              id="key-rename-clarity"
              role="status"
              className={
                "flex items-start gap-1.5 text-[11px] " +
                (clarityPreview.clarity === "clear"
                  ? "text-[var(--color-success)]"
                  : "text-[var(--color-warning)]")
              }
            >
              {clarityPreview.clarity === "clear" ? (
                <Check className="h-3 w-3 mt-0.5 shrink-0" />
              ) : (
                <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
              )}
              {clarityPreview.reason}
            </p>
          )}
        </form>
      )}

      {isManual && <Separator />}

      <form onSubmit={saveBudget} className="flex flex-col gap-2">
        <Label htmlFor="key-budget-edit">Monthly budget (USD)</Label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <span
              aria-hidden
              className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[var(--color-fg-subtle)]"
            >
              $
            </span>
            <Input
              id="key-budget-edit"
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0.01"
              max="1000000"
              value={budgetDollars}
              onChange={(e) => setBudgetDollars(e.target.value)}
              className="pl-7"
              aria-describedby="key-budget-edit-help"
              aria-invalid={budgetInvalid}
            />
          </div>
          <Button
            type="submit"
            size="sm"
            disabled={budgetInvalid || !budgetDirty || busy}
          >
            Save
          </Button>
        </div>
        <p
          id="key-budget-edit-help"
          className="text-[11px] text-[var(--color-fg-subtle)]"
        >
          Resets on the 1st of each calendar month (UTC). Currently displayed as a soft limit (no requests blocked).
        </p>
      </form>

      <Separator />

      <fieldset
        disabled={busy}
        className="flex flex-col gap-2"
        aria-describedby="status-help"
      >
        <Label asChild>
          <legend>Status</legend>
        </Label>
        <p id="status-help" className="text-[11px] text-[var(--color-fg-subtle)]">
          {isManual
            ? "Inactive keys are ignored by the proxy."
            : "Toggles via the Anthropic Admin API. Inactive keys reject new requests."}
        </p>
        <div className="flex gap-2 flex-wrap mt-1">
          {(["active", "inactive"] as const).map((opt) => (
            <Button
              key={opt}
              type="button"
              variant={s === opt ? "default" : "secondary"}
              size="sm"
              onClick={() => saveStatus(opt)}
              aria-pressed={s === opt}
            >
              <span className="capitalize">{opt}</span>
            </Button>
          ))}
        </div>
      </fieldset>

      <Separator />

      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium">Remove from Keymaster</p>
          <p className="text-[11px] text-[var(--color-fg-subtle)] max-w-md mt-0.5">
            {isManual
              ? "Permanently removes the key, its proxy token, and all logged requests from this manager. The actual Anthropic API key is unaffected."
              : "Removes the entry from this manager. The next sync will re-add it from Anthropic. To stop using the key, set it inactive instead."}
          </p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="ghost" size="sm" className="text-[var(--color-danger)] shrink-0">
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete this key from Keymaster?</DialogTitle>
              <DialogDescription>
                {isManual
                  ? "Removes the encrypted secret, the proxy token, and all logged requests. The actual API key in your Anthropic account is not affected — disable or rotate it in Console separately."
                  : "Removes the local entry. The next sync re-adds it. To stop using the key, set it inactive instead."}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="secondary" size="sm">
                  Cancel
                </Button>
              </DialogClose>
              <Button variant="danger" size="sm" onClick={destroy} disabled={busy}>
                {busy ? "Deleting…" : "Delete"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {err && (
        <p role="alert" className="text-sm text-[var(--color-danger)]">
          {err}
        </p>
      )}
    </div>
  );
}
