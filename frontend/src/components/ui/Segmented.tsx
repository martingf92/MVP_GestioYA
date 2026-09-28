export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
  size = 'md',
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  label: string;
  size?: 'sm' | 'md';
}) {
  return (
    <div role="group" aria-label={label} className="flex gap-2">
      {options.map((opt) => {
        const activo = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            aria-pressed={activo}
            onClick={() => onChange(opt.value)}
            className={`flex-1 rounded-[10px] px-3 font-semibold transition-colors duration-[120ms] ease-out
              ${size === 'sm' ? 'min-h-9 text-[13.5px]' : 'min-h-11 text-[14.5px]'}
              ${activo ? 'bg-ink text-white' : 'border border-input-border bg-white text-ink-soft hover:bg-[#F7F2E9]'}`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
