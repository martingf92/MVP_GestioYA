import { ButtonHTMLAttributes } from 'react';

export function Chip({
  active,
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return (
    <button
      type="button"
      className={`inline-flex min-h-9 items-center rounded-full px-4 text-[13.5px] font-medium transition-colors duration-[120ms] ease-out
        ${active ? 'bg-ink text-white' : 'border border-input-border bg-white text-ink-soft hover:bg-[#F7F2E9]'}
        ${className}`}
      {...props}
    />
  );
}
