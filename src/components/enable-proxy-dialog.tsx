"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Power, PowerOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

export function EnableProxyDialog({
  id,
  partialKeyHint,
  enabled,
}: {
  id: string;
  partialKeyHint: string;
  enabled: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [rawKey, setRawKey] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [pending, startTransition] = useTransition();

  async function enable(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setSubmitting(true);
    try {
      const res = await fetch(`/api/keys/${id}/proxy`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ rawKey: rawKey.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErr(data.error ?? "Could not enable proxy.");
        return;
      }
      setOpen(false);
      setRawKey("");
      startTransition(() => router.refresh());
    } finally {
      setSubmitting(false);
    }
  }

  async function disable() {
    setSubmitting(true);
    try {
      await fetch(`/api/keys/${id}/proxy`, { method: "DELETE" });
      setOpen(false);
      startTransition(() => router.refresh());
    } finally {
      setSubmitting(false);
    }
  }

  if (enabled) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="ghost" size="sm">
            <PowerOff className="h-3.5 w-3.5" />
            Disable proxy
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Disable proxy for this key?</DialogTitle>
            <DialogDescription>
              The encrypted secret will be removed. Apps using this key&apos;s proxy token will start receiving 401 responses until you re-enable.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="secondary" size="sm">Cancel</Button>
            </DialogClose>
            <Button variant="danger" size="sm" onClick={disable} disabled={submitting || pending}>
              {submitting ? "Disabling…" : "Disable"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="default" size="sm">
          <Power className="h-3.5 w-3.5" />
          Enable proxy
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Enable proxy</DialogTitle>
          <DialogDescription>
            Paste this key&apos;s secret value to route requests through Keymaster. Anthropic only shows the secret once, when the key is first created.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={enable} className="flex flex-col gap-3" noValidate>
          <div className="flex flex-col gap-2">
            <Label htmlFor="enable-raw-key">Secret value</Label>
            <Input
              id="enable-raw-key"
              type="password"
              required
              autoFocus
              autoComplete="off"
              placeholder={`sk-ant-api…  (must match hint ${partialKeyHint})`}
              value={rawKey}
              onChange={(e) => setRawKey(e.target.value)}
              spellCheck={false}
              aria-describedby="enable-raw-key-help"
            />
            <p
              id="enable-raw-key-help"
              className="text-[11px] text-[var(--color-fg-subtle)]"
            >
              Stored encrypted at rest. Lost the secret? Create a new key in Console and disable this one.
            </p>
          </div>
          {err && (
            <p role="alert" className="text-sm text-[var(--color-danger)]">
              {err}
            </p>
          )}
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="secondary" size="sm">Cancel</Button>
            </DialogClose>
            <Button type="submit" size="sm" disabled={!rawKey || submitting || pending}>
              {submitting ? "Enabling…" : "Enable"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
