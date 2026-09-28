'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Obligacion } from '@/lib/api';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { formatFechaCorta, formatMonto } from '@/lib/format';

export function ObligacionesLista({
  obligaciones,
  onAnular,
  mostrarEntidad = false,
  vacio = 'Esta entidad no tiene obligaciones cargadas.',
}: {
  obligaciones: Obligacion[];
  onAnular: (id: string) => Promise<void>;
  /** En el listado general de Cuentas: con quién es cada una. */
  mostrarEntidad?: boolean;
  vacio?: string;
}) {
  const [anulando, setAnulando] = useState<string | null>(null);

  if (obligaciones.length === 0) {
    return (
      <p className="rounded-xl border border-line bg-paper px-5 py-10 text-center text-[14px] text-ink-soft">
        {vacio}
      </p>
    );
  }

  async function anular(id: string) {
    setAnulando(id);
    try {
      await onAnular(id);
    } finally {
      setAnulando(null);
    }
  }

  return (
    <ul className="overflow-hidden rounded-xl border border-line bg-paper">
      {obligaciones.map((o) => {
        const abierta = o.estado === 'pendiente' || o.estado === 'parcial';
        const anulada = o.estado === 'anulada';
        const puedeAnular = !anulada && o.montoPagado === 0;
        const titulo = o.descripcion ?? o.tipo ?? 'Obligación';
        return (
          <li
            key={o.id}
            className={`flex flex-col gap-3 border-b border-line-soft px-4 py-4 last:border-0 sm:flex-row sm:items-center nav:px-5 ${anulada ? 'opacity-55' : ''}`}
          >
            <div className="min-w-0 flex-1">
              {mostrarEntidad && (
                <p className="mb-0.5 truncate text-[12.5px] font-semibold">
                  {o.entidad ? (
                    <Link href={`/cuentas/corrientes/${o.entidad.id}`}>{o.entidad.nombre}</Link>
                  ) : (
                    <span className="text-muted">Gasto general de la empresa</span>
                  )}
                </p>
              )}
              <div className="flex flex-wrap items-center gap-2">
                <p className={`text-[15px] font-semibold text-ink ${anulada ? 'line-through' : ''}`}>{titulo}</p>
                <StatusBadge estado={o.estado} size="sm" />
                {abierta && o.vencida && <StatusBadge estado="vencida" size="sm" />}
              </div>
              <p className="mt-0.5 text-[12.5px] text-muted">
                {o.direccion === 'a_pagar' ? (o.entidad ? 'Le debés' : 'A pagar') : o.entidad ? 'Te debe' : 'A cobrar'}
                {' · '}
                {o.fechaVencimiento ? `Vence el ${formatFechaCorta(o.fechaVencimiento)}` : 'Sin vencimiento'}
                {o.montoPagado > 0 &&
                  ` · pagado ${formatMonto(o.montoPagado, { centavos: true })} de ${formatMonto(o.monto, { centavos: true })}`}
                {o.remitoId && (
                  <>
                    {' · '}
                    <Link href={`/remitos/${o.remitoId}`}>
                      ver remito
                    </Link>
                  </>
                )}
              </p>
            </div>
            <div className="flex items-center justify-between gap-4 sm:justify-end">
              <div className="text-left sm:text-right">
                <p className="font-serif text-[18px] font-semibold text-ink tabular">
                  {formatMonto(abierta ? o.saldo : o.monto, { centavos: true })}
                </p>
                <p className="text-[12px] text-muted">{abierta ? 'pendiente' : 'total'}</p>
              </div>
              {puedeAnular && (
                <button
                  type="button"
                  onClick={() => anular(o.id)}
                  disabled={anulando === o.id}
                  aria-label={`Anular ${titulo}`}
                  className="min-h-9 rounded-[10px] px-3 text-[13.5px] font-semibold text-ink-soft hover:bg-neg-soft hover:text-neg disabled:opacity-50"
                >
                  {anulando === o.id ? 'Anulando…' : 'Anular'}
                </button>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
