"use client";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { analyzeNameClarity } from "@/lib/purpose-clarity";

export function ManualKeyForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [rawKey, setRawKey] = useState("");
  const [budgetDollars, setBudgetDollars] = useState("5.00");
  const [err, setErr] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [pending, startTransition] = useTransition();

  const clarity = useMemo(() => {
    if (!name.trim()) return null;
    return analyzeNameClarity(name);
  }, [name]);

  const budgetCents = useMemo(() => {
    const n = parseFloat(budgetDollars);
    if (!Number.isFinite(n)) return null;
    return Math.round(n * 100);
  }, [budgetDollars]);

  const budgetInvalid = budgetCents === null || budgetCents < 1;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (budgetInvalid) {
      setErr("Enter a monthly budget of at least $0.01.");
      return;
    }
    setErr(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/keys", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          rawKey: rawKey.trim(),
          monthlyBudgetCents: budgetCents,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErr(data.error ?? "Could not add key.");
        return;
      }
      startTransition(() => {
        router.push(`/keys/${data.key.id}`);
        router.refresh();
      });
    } finally {
      setSubmitting(false);
    }
  }

  const busy = submitting || pending;

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
      <div className="flex flex-col gap-2">
        <Label htmlFor="key-name">Name (purpose)</Label>
        <Input
          id="key-name"
          required
          maxLength={160}
          autoFocus
          placeholder="e.g. Classifies incoming support tickets"
          value={name}
          onChange={(e) => setName(e.target.value)}
          aria-describedby="key-name-help key-clarity"
          aria-invalid={clarity?.clarity === "unclear"}
        />
        <p id="key-name-help" className="text-[11px] text-[var(--color-fg-subtle)]">
          This becomes the key&apos;s purpose. Describe what the key is for; the classifier compares each request against it.
        </p>
        {clarity && (
          <p
            id="key-clarity"
            role="status"
            className={
              "flex items-start gap-1.5 text-[11px] " +
              (clarity.clarity === "clear"
                ? "text-[var(--color-success)]"
                : "text-[var(--color-warning)]")
            }
          >
            {clarity.clarity === "clear" ? (
              <Check className="h-3 w-3 mt-0.5 shrink-0" />
            ) : (
              <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
            )}
            {clarity.reason}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="key-secret">Secret value</Label>
        <Input
          id="key-secret"
          type="password"
          required
          autoComplete="off"
          spellCheck={false}
          placeholder="sk-ant-api03-…"
          value={rawKey}
          onChange={(e) => setRawKey(e.target.value)}
          aria-describedby="key-secret-help"
        />
        <p id="key-secret-help" className="text-[11px] text-[var(--color-fg-subtle)]">
          Stored encrypted at rest. Anthropic only shows this value once at creation.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="key-budget">Monthly budget (USD)</Label>
        <div className="relative">
          <span
            aria-hidden
            className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[var(--color-fg-subtle)]"
          >
            $
          </span>
          <Input
            id="key-budget"
            type="number"
            required
            inputMode="decimal"
            step="0.01"
            min="0.01"
            max="1000000"
            placeholder="5.00"
            value={budgetDollars}
            onChange={(e) => setBudgetDollars(e.target.value)}
            className="pl-7"
            aria-describedby="key-budget-help"
            aria-invalid={budgetInvalid}
          />
        </div>
        <p id="key-budget-help" className="text-[11px] text-[var(--color-fg-subtle)]">
          Resets on the 1st of each calendar month (UTC). Spend over the limit is shown but not blocked.
        </p>
      </div>

      {err && (
        <p role="alert" className="text-sm text-[var(--color-danger)]">
          {err}
        </p>
      )}

      <div className="flex gap-2 pt-2">
        <Button
          type="submit"
          disabled={!name || !rawKey || budgetInvalid || busy}
        >
          {busy ? "Adding…" : "Add key"}
        </Button>
      </div>
    </form>
  );
}
