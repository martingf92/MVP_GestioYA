import { ReactNode } from 'react';
import { TriangleAlert } from 'lucide-react';

export function Field({
  label,
  htmlFor,
  error,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-[7px]">
      <label htmlFor={htmlFor} className="text-[13px] font-semibold text-ink-soft">
        {label}
      </label>
      {children}
      {error && (
        <p className="flex items-center gap-1 text-[12px] text-neg">
          <TriangleAlert className="h-3.5 w-3.5 flex-shrink-0" aria-hidden />
          {error}
        </p>
      )}
    </div>
  );
}
