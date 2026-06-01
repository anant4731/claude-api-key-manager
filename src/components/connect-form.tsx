"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ConnectForm() {
  const router = useRouter();
  const [key, setKey] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [stage, setStage] = useState<"idle" | "connecting" | "syncing">("idle");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setStage("connecting");
    try {
      const res = await fetch("/api/account", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ adminKey: key.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErr(data.error ?? "Could not connect.");
        setStage("idle");
        return;
      }
      setStage("syncing");
      await fetch("/api/sync", { method: "POST" });
      router.push("/");
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
      setStage("idle");
    }
  }

  const busy = stage !== "idle";

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3" noValidate>
      <div className="flex flex-col gap-2">
        <Label htmlFor="admin-key">Admin API key</Label>
        <Input
          id="admin-key"
          type="password"
          required
          autoComplete="off"
          autoFocus
          placeholder="sk-ant-admin01-…"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          aria-describedby="admin-key-help"
          spellCheck={false}
        />
        <p
          id="admin-key-help"
          className="text-[11px] text-[var(--color-fg-subtle)]"
        >
          Starts with <code className="font-mono">sk-ant-admin</code>.
        </p>
      </div>

      {err && (
        <p role="alert" className="text-sm text-[var(--color-danger)]">
          {err}
        </p>
      )}

      <Button type="submit" disabled={!key || busy} className="w-full">
        {stage === "connecting"
          ? "Verifying…"
          : stage === "syncing"
            ? "Syncing keys…"
            : "Connect"}
      </Button>
    </form>
  );
}
