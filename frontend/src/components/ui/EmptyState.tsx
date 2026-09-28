import { ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  secondaryAction,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
  secondaryAction?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-line bg-paper px-6 py-14 text-center">
      <Icon className="h-11 w-11 text-muted" strokeWidth={1.5} aria-hidden />
      <p className="font-serif text-[19px] font-semibold text-ink">{title}</p>
      <p className="max-w-sm text-[14px] text-ink-soft">{description}</p>
      {(action || secondaryAction) && (
        <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
          {action}
          {secondaryAction}
        </div>
      )}
    </div>
  );
}
