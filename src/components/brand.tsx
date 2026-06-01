import { cn } from "@/lib/utils";

export function Brand({
  className,
  size = "md",
}: {
  className?: string;
  size?: "sm" | "md";
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-2.5 font-semibold tracking-tight",
        size === "sm" ? "text-sm" : "text-[15px]",
        className
      )}
    >
      <span
        aria-hidden
        className={cn(
          "inline-flex items-center justify-center rounded-md bg-[color-mix(in_oklab,var(--color-brand)_25%,transparent)] text-[var(--color-brand)] border border-[color-mix(in_oklab,var(--color-brand)_35%,transparent)]",
          size === "sm" ? "h-6 w-6 text-[10px]" : "h-7 w-7 text-[11px]"
        )}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4"}
        >
          <path
            d="M7 5L12 19L17 5M9.5 13.5H14.5"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      <span>
        Keymaster
        <span className="ml-1 text-[var(--color-fg-subtle)] font-normal">/claude</span>
      </span>
    </div>
  );
}
