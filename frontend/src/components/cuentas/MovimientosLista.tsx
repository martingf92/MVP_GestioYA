'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Banknote, FileText, LucideIcon, ReceiptText, Undo2, FilePlus2 } from 'lucide-react';
import { MovimientoCuenta } from '@/lib/api';
import { formatFechaPartes, formatMontoConSigno, formatMonto } from '@/lib/format';

const PAGINA = 10;

type Presentacion = {
  icon: LucideIcon;
  tono: string;
  titulo: string;
  detalle: React.ReactNode;
};

const MEDIOS: Record<string, string> = {
  efectivo: 'efectivo',
  transferencia: 'transferencia',
  cheque: 'cheque',
};

function sinPrefijo(concepto: string | null, prefijo: string): string {
  if (!concepto) return '';
  return concepto.startsWith(prefijo) ? concepto.slice(prefijo.length) : concepto;
}

function presentar(m: MovimientoCuenta): Presentacion {
  const monto = Number(m.monto);
  const origen = m.origen;

  if (origen?.tipo === 'remito' && origen.remito) {
    const numero = origen.remito.numero ?? origen.remito.id.slice(0, 8);
    return {
      icon: FileText,
      tono: 'bg-canvas text-ink-soft',
      titulo: `Remito ${numero}`,
      detalle: (
        <>
          {monto >= 0 ? 'Generó una deuda a cobrar' : 'Generó una deuda a pagar'} ·{' '}
          <Link href={`/remitos/${origen.remito.id}`}>ver remito</Link>
        </>
      ),
    };
  }

  if (origen?.tipo === 'pago' && origen.pago) {
    // Un pago que baja el saldo es un cobro (la entidad nos pagó); uno que
    // lo sube es un pago nuestro (le pagamos a la entidad).
    const esCobro = monto < 0;
    const conCheque = origen.pago.cheques > 0;
    const medio = origen.pago.medio ? MEDIOS[origen.pago.medio] ?? origen.pago.medio : null;
    return {
      icon: conCheque ? ReceiptText : Banknote,
      tono: conCheque
        ? 'bg-terra-soft text-terra-on-soft'
        : esCobro
          ? 'bg-verde-soft text-verde-on-soft'
          : 'bg-canvas text-ink-soft',
      titulo: `${esCobro ? 'Cobro' : 'Pago'}${conCheque ? ' con cheque' : medio ? ` · ${medio}` : ''}`,
      detalle: `Aplicado a ${sinPrefijo(m.concepto, 'Pago aplicado a obligación: ') || 'una obligación'}`,
    };
  }

  if (origen?.tipo === 'anulacion') {
    return {
      icon: Undo2,
      tono: 'bg-canvas text-muted',
      titulo: m.concepto?.startsWith('Reversión') ? 'Anulación de un pago' : 'Anulación de una obligación',
      detalle: `Compensa: ${sinPrefijo(sinPrefijo(m.concepto, 'Anulación de obligación: '), 'Reversión de pago aplicado a obligación: ')}`,
    };
  }

  return {
    icon: FilePlus2,
    tono: 'bg-canvas text-ink-soft',
    titulo: sinPrefijo(m.concepto, 'Obligación: ') || 'Movimiento',
    detalle: 'Obligación cargada a mano',
  };
}

export function MovimientosLista({ movimientos }: { movimientos: MovimientoCuenta[] }) {
  const [visibles, setVisibles] = useState(PAGINA);

  if (movimientos.length === 0) {
    return (
      <p className="rounded-xl border border-line bg-paper px-5 py-10 text-center text-[14px] text-ink-soft">
        Todavía no hay movimientos. Se generan solos al emitir un remito, cargar una obligación o
        registrar un pago.
      </p>
    );
  }

  const pagina = movimientos.slice(0, visibles);

  return (
    <div className="overflow-hidden rounded-xl border border-line bg-paper">
      {/* Mobile / tablet: filas apiladas */}
      <ul className="nav:hidden">
        {pagina.map((m) => {
          const p = presentar(m);
          const anulado = !!m.origen?.anulado;
          const { diaMes, anio } = formatFechaPartes(m.fecha);
          return (
            <li key={m.id} className="flex items-start gap-3 border-b border-line-soft px-4 py-3.5 last:border-0">
              <Icono p={p} />
              <div className={`min-w-0 flex-1 ${anulado ? 'opacity-55' : ''}`}>
                <p className={`text-[14.5px] font-medium text-ink ${anulado ? 'line-through' : ''}`}>{p.titulo}</p>
                <p className="text-[12.5px] text-muted">
                  {diaMes} {anio} · {anulado ? 'Anulado después' : p.detalle}
                </p>
              </div>
              <div className="flex-shrink-0 text-right">
                <Monto valor={m.monto} anulado={anulado} />
                <p className="text-[12px] text-muted tabular">
                  saldo {formatMontoConSigno(m.saldoResultante, { centavos: true })}
                </p>
              </div>
            </li>
          );
        })}
      </ul>

      {/* Desktop: tabla */}
      <table className="hidden w-full border-collapse text-left nav:table">
        <caption className="sr-only">Movimientos de la cuenta corriente, del más nuevo al más viejo</caption>
        <thead>
          <tr className="border-b border-line">
            {['Fecha', 'Concepto', 'Monto', 'Saldo resultante'].map((h, i) => (
              <th
                key={h}
                scope="col"
                className={`px-5 py-3 text-[12px] font-bold tracking-[0.1em] text-muted uppercase ${i >= 2 ? 'text-right' : ''}`}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {pagina.map((m) => {
            const p = presentar(m);
            const anulado = !!m.origen?.anulado;
            const { diaMes, anio } = formatFechaPartes(m.fecha);
            return (
              <tr key={m.id} className="border-b border-line-soft last:border-0 hover:bg-paper-hover">
                <td className="w-[110px] px-5 py-3.5 align-top">
                  <p className="text-[14px] font-semibold text-ink">{diaMes}</p>
                  <p className="text-[12px] text-muted">{anio}</p>
                </td>
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    <Icono p={p} />
                    <div className={`min-w-0 ${anulado ? 'opacity-55' : ''}`}>
                      <p className={`text-[14.5px] font-medium text-ink ${anulado ? 'line-through' : ''}`}>
                        {p.titulo}
                      </p>
                      <p className="text-[12.5px] text-muted">
                        {anulado ? 'Anulado después · se compensó con un ajuste' : p.detalle}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-3.5 text-right">
                  <Monto valor={m.monto} anulado={anulado} />
                </td>
                <td className="px-5 py-3.5 text-right font-serif text-[17px] font-semibold text-ink tabular">
                  {formatMontoConSigno(m.saldoResultante, { centavos: true })}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="flex items-center justify-between gap-3 border-t border-line bg-paper-hover px-4 py-3 text-[13px] text-muted nav:px-5">
        <span>
          {pagina.length} de {movimientos.length} movimientos
        </span>
        {visibles < movimientos.length && (
          <button
            type="button"
            onClick={() => setVisibles((v) => v + PAGINA)}
            className="min-h-9 font-semibold text-verde hover:underline"
          >
            Ver más
          </button>
        )}
      </div>
    </div>
  );
}

function Icono({ p }: { p: Presentacion }) {
  const Icon = p.icon;
  return (
    <span className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg ${p.tono}`} aria-hidden>
      <Icon className="h-4 w-4" strokeWidth={1.75} />
    </span>
  );
}

function Monto({ valor, anulado }: { valor: string; anulado: boolean }) {
  const n = Number(valor);
  const color = n > 0 ? 'text-verde' : n < 0 ? 'text-neg' : 'text-muted';
  return (
    <p className={`text-[14.5px] font-semibold tabular ${color} ${anulado ? 'line-through opacity-55' : ''}`}>
      {formatMontoConSigno(n, { centavos: true })}
      <span className="sr-only">
        {n > 0 ? ` (sube lo que te deben ${formatMonto(n)})` : n < 0 ? ` (baja el saldo ${formatMonto(n)})` : ''}
      </span>
    </p>
  );
}
