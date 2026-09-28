'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ReceiptText } from 'lucide-react';
import { Pago } from '@/lib/api';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { formatFechaCorta, formatMonto } from '@/lib/format';

const MEDIOS: Record<string, string> = {
  efectivo: 'Efectivo',
  transferencia: 'Transferencia',
  cheque: 'Cheque',
};

export function PagosLista({
  pagos,
  onAnular,
  mostrarEntidad = false,
}: {
  pagos: Pago[];
  onAnular: (id: string) => Promise<void>;
  /** En el listado general de Cuentas: con quién fue cada pago. */
  mostrarEntidad?: boolean;
}) {
  const [anulando, setAnulando] = useState<string | null>(null);

  if (pagos.length === 0) {
    return (
      <p className="rounded-xl border border-line bg-paper px-5 py-10 text-center text-[14px] text-ink-soft">
        Todavía no hay cobros ni pagos registrados con esta entidad.
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
      {pagos.map((p) => {
        const anulado = p.estado === 'rechazado';
        const aplicado = p.aplicaciones.reduce((s, a) => s + Number(a.monto), 0);
        return (
          <li key={p.id} className="border-b border-line-soft px-4 py-4 last:border-0 nav:px-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className={`min-w-0 flex-1 ${anulado ? 'opacity-55' : ''}`}>
                {mostrarEntidad && (
                  <p className="mb-0.5 truncate text-[12.5px] font-semibold">
                    {p.entidad ? (
                      <Link href={`/cuentas/corrientes/${p.entidad.id}`}>{p.entidad.nombre}</Link>
                    ) : (
                      <span className="text-muted">Gasto general de la empresa</span>
                    )}
                  </p>
                )}
                <div className="flex flex-wrap items-center gap-2">
                  <p className={`text-[15px] font-semibold text-ink ${anulado ? 'line-through' : ''}`}>
                    {p.medio ? MEDIOS[p.medio] ?? p.medio : 'Pago'} · {formatFechaCorta(p.fecha)}
                  </p>
                  {anulado && <StatusBadge estado="anulado" size="sm" />}
                </div>
                <p className="mt-0.5 text-[12.5px] text-muted">
                  {p.aplicaciones.length === 0
                    ? 'Sin aplicar a ninguna obligación'
                    : `Aplicado a ${p.aplicaciones.length} ${p.aplicaciones.length === 1 ? 'obligación' : 'obligaciones'}`}
                  {aplicado > 0 && aplicado < Number(p.monto) - 0.005 &&
                    ` · ${formatMonto(Number(p.monto) - aplicado, { centavos: true })} sin aplicar`}
                </p>
              </div>
              <div className="flex items-center justify-between gap-4 sm:justify-end">
                <p className={`font-serif text-[18px] font-semibold text-ink tabular ${anulado ? 'line-through opacity-55' : ''}`}>
                  {formatMonto(p.monto, { centavos: true })}
                </p>
                {!anulado && (
                  <button
                    type="button"
                    onClick={() => anular(p.id)}
                    disabled={anulando === p.id}
                    className="min-h-9 rounded-[10px] px-3 text-[13.5px] font-semibold text-ink-soft hover:bg-neg-soft hover:text-neg disabled:opacity-50"
                  >
                    {anulando === p.id ? 'Anulando…' : 'Anular'}
                  </button>
                )}
              </div>
            </div>

            {p.cheques.length > 0 && (
              <ul className={`mt-3 flex flex-col gap-2 ${anulado ? 'opacity-55' : ''}`}>
                {p.cheques.map((c) => (
                  <li
                    key={c.id}
                    className="flex items-center gap-2.5 rounded-lg border border-terra-soft-border bg-terra-soft px-3 py-2 text-[13px] text-terra-on-soft"
                  >
                    <ReceiptText className="h-4 w-4 flex-shrink-0" aria-hidden />
                    <span className="min-w-0 flex-1 truncate">
                      Cheque {c.numero ? `nº ${c.numero}` : 'sin número'}
                      {c.banco && ` · ${c.banco}`}
                      {c.fechaCobro && ` · se cobra el ${formatFechaCorta(c.fechaCobro)}`}
                    </span>
                    {c.monto && <span className="font-semibold tabular">{formatMonto(c.monto, { centavos: true })}</span>}
                  </li>
                ))}
              </ul>
            )}
          </li>
        );
      })}
    </ul>
  );
}
