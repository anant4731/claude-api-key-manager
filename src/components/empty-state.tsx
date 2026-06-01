import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function EmptyState({
  title,
  description,
  action,
  icon,
  className,
}: {
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}) {
  return (
    <Card
      className={cn(
        "flex flex-col items-center justify-center text-center p-10 gap-3 border-dashed",
        className
      )}
    >
      {icon && (
        <div className="text-[var(--color-fg-subtle)]" aria-hidden>
          {icon}
        </div>
      )}
      <h3 className="text-base font-medium tracking-tight">{title}</h3>
      {description && (
        <p className="text-sm text-[var(--color-fg-muted)] max-w-md">
          {description}
        </p>
      )}
      {action && <div className="mt-2">{action}</div>}
    </Card>
  );
}
