import { ChevronDown } from 'lucide-react';
import { Entidad } from '@/lib/api';

/** Valor especial: obligación / pago sin entidad (gasto general de la empresa). */
export const GASTO_GENERAL = '__gasto__';

export function EntidadSelect({
  id,
  entidades,
  value,
  onChange,
  error,
}: {
  id: string;
  entidades: Entidad[];
  value: string;
  onChange: (value: string) => void;
  error?: boolean;
}) {
  return (
    <div className="relative">
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`min-h-11 w-full appearance-none rounded-[10px] border bg-white py-[12px] pr-10 pl-[15px] text-[15px] text-ink focus-visible:outline-none
          ${error ? 'border-[1.5px] border-neg-input-border' : 'border-input-border'}
          ${value === '' ? 'text-placeholder' : ''}`}
      >
        <option value="" disabled>
          Elegí con quién…
        </option>
        <option value={GASTO_GENERAL}>Gasto general de la empresa (sin entidad)</option>
        {entidades.length > 0 && (
          <optgroup label="Entidades">
            {entidades.map((e) => (
              <option key={e.id} value={e.id}>
                {e.nombre}
              </option>
            ))}
          </optgroup>
        )}
      </select>
      <ChevronDown
        className="pointer-events-none absolute top-1/2 right-3.5 h-4 w-4 -translate-y-1/2 text-muted"
        aria-hidden
      />
    </div>
  );
}
