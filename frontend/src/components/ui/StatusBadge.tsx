import { Ban, Check, Circle, Clock, Contrast, LucideIcon, Pencil } from 'lucide-react';

export type Estado =
  | 'borrador'
  | 'emitido'
  | 'anulado'
  | 'anulada'
  | 'vencida'
  | 'parcial'
  | 'cancelada'
  | 'pendiente';

// Glifo + palabra, nunca solo color (ver README del handoff, "Badge de
// estado"). Mapeo semántico: lápiz = borrador, check = emitido/cancelada,
// prohibido = anulado, reloj = vencida, medio círculo = parcial.
const ESTADOS: Record<Estado, { label: string; icon: LucideIcon; clase: string }> = {
  borrador: { label: 'Borrador', icon: Pencil, clase: 'bg-canvas border-input-border text-ink-soft' },
  emitido: { label: 'Emitido', icon: Check, clase: 'bg-verde-soft border-verde-soft-border text-verde-on-soft' },
  anulado: { label: 'Anulado', icon: Ban, clase: 'bg-canvas border-input-border text-muted' },
  anulada: { label: 'Anulada', icon: Ban, clase: 'bg-canvas border-input-border text-muted' },
  vencida: { label: 'Vencida', icon: Clock, clase: 'bg-warn-soft border-warn-soft-border text-warn-on-soft' },
  parcial: { label: 'Parcial', icon: Contrast, clase: 'bg-neg-soft border-neg-soft-border text-neg' },
  cancelada: { label: 'Cancelada', icon: Check, clase: 'bg-verde-soft border-verde-soft-border text-verde-on-soft' },
  pendiente: { label: 'Pendiente', icon: Circle, clase: 'bg-canvas border-input-border text-ink-soft' },
};

export function StatusBadge({ estado, size = 'md' }: { estado: Estado; size?: 'sm' | 'md' }) {
  const { label, icon: Icon, clase } = ESTADOS[estado];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border font-semibold whitespace-nowrap ${clase}
        ${size === 'sm' ? 'px-2 py-[3px] text-[12px]' : 'px-3 py-1.5 text-[13px]'}`}
    >
      <Icon className={size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5'} aria-hidden />
      {label}
    </span>
  );
}
