import * as React from "react";
import { cn } from "@/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-medium uppercase tracking-wider",
  {
    variants: {
      tone: {
        neutral:
          "bg-[var(--color-surface-2)] text-[var(--color-fg-muted)] border border-[var(--color-border)]",
        brand:
          "bg-[color-mix(in_oklab,var(--color-brand)_18%,transparent)] text-[var(--color-brand)] border border-[color-mix(in_oklab,var(--color-brand)_30%,transparent)]",
        success:
          "bg-[color-mix(in_oklab,var(--color-success)_15%,transparent)] text-[var(--color-success)] border border-[color-mix(in_oklab,var(--color-success)_25%,transparent)]",
        warning:
          "bg-[color-mix(in_oklab,var(--color-warning)_15%,transparent)] text-[var(--color-warning)] border border-[color-mix(in_oklab,var(--color-warning)_25%,transparent)]",
        danger:
          "bg-[color-mix(in_oklab,var(--color-danger)_15%,transparent)] text-[var(--color-danger)] border border-[color-mix(in_oklab,var(--color-danger)_25%,transparent)]",
      },
    },
    defaultVariants: { tone: "neutral" },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, tone, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ tone }), className)} {...props} />;
}
