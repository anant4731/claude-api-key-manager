"use client";
import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CopyProxyButton({
  proxyToken,
  label = "Copy proxy token",
}: {
  proxyToken: string;
  label?: string;
}) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(proxyToken);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {

      const tmp = document.createElement("textarea");
      tmp.value = proxyToken;
      document.body.appendChild(tmp);
      tmp.select();
      document.execCommand("copy");
      tmp.remove();
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  }
  return (
    <Button
      variant="secondary"
      size="sm"
      onClick={copy}
      aria-live="polite"
      aria-label={copied ? "Copied" : label}
    >
      {copied ? (
        <Check className="h-3.5 w-3.5 text-[var(--color-success)]" />
      ) : (
        <Copy className="h-3.5 w-3.5" />
      )}
      {copied ? "Copied" : "Copy proxy token"}
    </Button>
  );
}
