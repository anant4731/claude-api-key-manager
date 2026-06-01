"use client";
import { useState } from "react";
import { Check, Copy } from "lucide-react";

export function CodeBlock({ children }: { children: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(children);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
    }
  }
  return (
    <div className="relative group">
      <pre className="overflow-x-auto rounded-md bg-[var(--color-bg)] border border-[var(--color-border)] p-3 pr-12 text-[12px] font-mono leading-relaxed whitespace-pre-wrap break-all sm:break-normal">
        {children}
      </pre>
      <button
        type="button"
        onClick={copy}
        aria-label={copied ? "Copied" : "Copy"}
        className="absolute top-2 right-2 rounded-md p-1.5 bg-[var(--color-surface-2)] border border-[var(--color-border-strong)] text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand)] transition-opacity opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
      >
        {copied ? (
          <Check className="h-3.5 w-3.5 text-[var(--color-success)]" />
        ) : (
          <Copy className="h-3.5 w-3.5" />
        )}
      </button>
    </div>
  );
}
