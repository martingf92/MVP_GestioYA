const currencyFormatter = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

/** Sin signo -- quien llama decide si antepone "+ " / "− " (ver formatSaldo). */
export function formatMonto(value: number | string): string {
  const n = typeof value === 'string' ? Number(value) : value;
  return currencyFormatter.format(Math.abs(n));
}

/**
 * Saldo de cuenta corriente: positivo = la entidad nos debe, negativo = le
 * debemos, cero = sin saldo. El signo SIEMPRE viene del servidor -- acá solo
 * se deriva la presentación (texto, color, signo), nunca se recalcula.
 */
export function formatSaldo(value: number | string) {
  const n = typeof value === 'string' ? Number(value) : value;
  if (n > 0) {
    return { texto: `+ ${formatMonto(n)}`, leyenda: 'te deben', color: 'verde' as const };
  }
  if (n < 0) {
    return { texto: `− ${formatMonto(n)}`, leyenda: 'le debés', color: 'neg' as const };
  }
  return { texto: formatMonto(0), leyenda: 'sin saldo', color: 'muted' as const };
}

const compactFormatter = new Intl.NumberFormat('es-AR', {
  notation: 'compact',
  maximumFractionDigits: 1,
});

/** Para ticks de ejes: "$ 50 mil", "$ 1,2 M". */
export function formatMontoCompacto(value: number): string {
  return `$ ${compactFormatter.format(value)}`;
}

export function formatFechaCorta(iso: string): string {
  return new Date(iso).toLocaleDateString('es-AR', {
    day: 'numeric',
    month: 'numeric',
    timeZone: 'UTC',
  });
}

/** Días enteros transcurridos desde una fecha (0 = hoy). */
export function diasDesde(iso: string): number {
  const inicio = new Date(new Date(iso).toDateString()).getTime();
  const hoy = new Date(new Date().toDateString()).getTime();
  return Math.round((hoy - inicio) / 86_400_000);
}

/** Fecha relativa en castellano rioplatense, para "último movimiento". */
export function formatFechaRelativa(iso: string | null): string {
  if (!iso) return '—';
  const fecha = new Date(iso);
  const hoy = new Date();
  const diffMs = new Date(hoy.toDateString()).getTime() - new Date(fecha.toDateString()).getTime();
  const dias = Math.round(diffMs / 86_400_000);

  if (dias === 0) return 'hoy';
  if (dias === 1) return 'ayer';
  if (dias > 1 && dias < 30) return `hace ${dias} días`;
  return fecha.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' });
}
