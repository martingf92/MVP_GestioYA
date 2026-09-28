import { Check } from 'lucide-react';

export function Checkbox({
  id,
  checked,
  onChange,
  label,
}: {
  id: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
}) {
  return (
    <label htmlFor={id} className="inline-flex cursor-pointer items-center gap-2 select-none">
      <span className="relative inline-flex h-[18px] w-[18px] flex-shrink-0">
        <input
          id={id}
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="peer absolute inset-0 z-10 cursor-pointer opacity-0"
        />
        <span className="h-[18px] w-[18px] rounded-[5px] border border-input-border bg-white transition-colors peer-checked:border-verde peer-checked:bg-verde" />
        <Check
          className="pointer-events-none absolute inset-0 m-auto h-3 w-3 text-white opacity-0 peer-checked:opacity-100"
          aria-hidden
        />
      </span>
      <span className="text-[14px] text-ink-soft">{label}</span>
    </label>
  );
}
