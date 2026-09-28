import { ReactNode } from 'react';
import { TriangleAlert, Clock } from 'lucide-react';

type Variant = 'error' | 'warn';

const styles: Record<Variant, string> = {
  error: 'bg-neg-soft border-neg-soft-border text-neg-on-soft',
  warn: 'bg-warn-banner border-warn-soft-border text-warn-on-soft',
};

const icons: Record<Variant, typeof TriangleAlert> = {
  error: TriangleAlert,
  warn: Clock,
};

export function AlertBanner({
  variant = 'error',
  title,
  children,
  className = '',
}: {
  variant?: Variant;
  title?: string;
  children: ReactNode;
  className?: string;
}) {
  const Icon = icons[variant];
  return (
    <div
      role={variant === 'error' ? 'alert' : undefined}
      className={`flex items-start gap-2.5 rounded-xl border p-3.5 text-[13px] leading-[1.55] ${styles[variant]} ${className}`}
    >
      <Icon className="mt-0.5 h-4 w-4 flex-shrink-0" aria-hidden />
      <div>
        {title && <p className="font-semibold">{title}</p>}
        <p>{children}</p>
      </div>
    </div>
  );
}
