'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowDownLeft, ArrowUpRight, Ban, ChevronRight, FileText } from 'lucide-react';
import { Button, buttonClasses } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Avatar } from '@/components/ui/Avatar';
import { AlertBanner } from '@/components/ui/AlertBanner';
import { Modal } from '@/components/ui/Modal';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { ApiError, Remito, anularRemito, openRemitoPdf } from '@/lib/api';
import { diasDesde, formatFechaPartes, formatMontoExacto, remitoTitulo } from '@/lib/format';

/** Detalle de un remito emitido o anulado (solo lectura + PDF + anular). */
export function RemitoDetalle({
  remito: r,
  onCambio,
}: {
  remito: Remito;
  onCambio: (remito: Remito) => void;
}) {
  const [modal, setModal] = useState(false);
  const [accion, setAccion] = useState<{ busy: boolean; error: string | null }>({ busy: false, error: null });
  const [errorPdf, setErrorPdf] = useState<string | null>(null);

  const salida = r.tipo === 'S';
  const anulado = r.estado === 'anulado';
  const fecha = formatFechaPartes(r.fecha);
  const total = r.detalles.reduce((acc, d) => acc + Number(d.subtotal), 0);

  const ob = r.obligacionGenerada ?? null;
  const pagado = ob ? ob.aplicaciones.reduce((acc, a) => acc + Number(a.monto), 0) : 0;
  const falta = ob ? Number(ob.monto) - pagado : 0;
  const obAbierta = !!ob && (ob.estado === 'pendiente' || ob.estado === 'parcial');
  const obVencida =
    obAbierta && !!ob?.fechaVencimiento && diasDesde(ob.fechaVencimiento) > 0;
  // Mismo criterio que RemitosService.anular(): con pagos aplicados no se
  // puede anular (dejaría la cuenta corriente inconsistente).
  const anulacionBloqueada = !!ob && ob.estado !== 'anulada' && pagado > 0;

  async function verPdf() {
    setErrorPdf(null);
    try {
      await openRemitoPdf(r.id, `remito-${r.numero ?? 'sin-numero'}.pdf`);
    } catch (err) {
      setErrorPdf(err instanceof ApiError ? err.message : 'Se cortó la conexión.');
    }
  }

  async function anular() {
    setAccion({ busy: true, error: null });
    try {
      const actualizado = await anularRemito(r.id);
      setModal(false);
      setAccion({ busy: false, error: null });
      onCambio(actualizado);
    } catch (err) {
      setAccion({ busy: false, error: err instanceof ApiError ? err.message : 'Se cortó la conexión.' });
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-5 flex flex-col gap-4 nav:flex-row nav:items-end nav:justify-between">
        <div className="min-w-0">
          <nav aria-label="Ubicación" className="mb-1.5 flex items-center gap-1 text-[13px] text-muted">
            <Link href="/remitos" className="text-muted no-underline hover:underline">
              Remitos
            </Link>
            <ChevronRight className="h-3.5 w-3.5" aria-hidden />
            <span className="text-ink-soft">{remitoTitulo(r)}</span>
          </nav>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <h1 className="font-serif text-[24px] font-semibold text-ink nav:text-[26px]">
              Remito {remitoTitulo(r)}
            </h1>
            <StatusBadge estado={r.estado} />
          </div>
          <p className="mt-1 flex items-center gap-1.5 text-[13.5px] text-muted">
            {salida ? (
              <ArrowUpRight className="h-4 w-4 text-verde" aria-hidden />
            ) : (
              <ArrowDownLeft className="h-4 w-4 text-terra" aria-hidden />
            )}
            {salida ? 'Salida' : 'Entrada'} · {fecha.diaMes} {fecha.anio}
          </p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <Button variant="secondary" onClick={verPdf} className="gap-1.5">
            <FileText className="h-4 w-4" aria-hidden />
            Ver PDF
          </Button>
          {!anulado && (
            <Button variant="destructive" onClick={() => setModal(true)} className="gap-1.5">
              <Ban className="h-4 w-4" aria-hidden />
              Anular
            </Button>
          )}
        </div>
      </div>

      {errorPdf && (
        <AlertBanner variant="error" className="mb-4">
          {errorPdf}
        </AlertBanner>
      )}

      {anulado && (
        <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-input-border bg-canvas p-4 text-[13.5px] text-ink-soft">
          <Ban className="mt-0.5 h-4 w-4 flex-shrink-0 text-muted" aria-hidden />
          <p>
            <strong className="text-ink">Este remito está anulado.</strong>{' '}
            {ob
              ? 'La deuda que había generado también se anuló: la cuenta corriente quedó compensada con un ajuste.'
              : 'No tiene movimientos en ninguna cuenta corriente.'}{' '}
            {r.numero && 'Su número queda usado.'}
          </p>
        </div>
      )}

      <div className="xl:grid xl:grid-cols-[minmax(0,1fr)_340px] xl:items-start xl:gap-6">
        <div className="flex flex-col gap-5">
          {/* Datos */}
          <Card className="grid grid-cols-2 gap-4 nav:grid-cols-[2fr_1fr_1fr]">
            <Dato label={salida ? 'Se lo entregaste a' : 'Te lo entregó'} className="col-span-2 nav:col-span-1">
              {r.entidad ? (
                <div className="flex items-center gap-2.5">
                  <Avatar nombre={r.entidad.nombre} tono={salida ? 'verde' : 'terra'} />
                  <div className="min-w-0">
                    <Link
                      href={`/cuentas/corrientes/${r.entidad.id}`}
                      className="block truncate text-[15px] font-semibold text-ink no-underline hover:underline"
                    >
                      {r.entidad.nombre}
                    </Link>
                    <p className="truncate text-[12.5px] text-muted">
                      {r.entidad.documentoNro
                        ? `${r.entidad.documentoTipo ?? 'Doc.'} ${r.entidad.documentoNro}`
                        : 'Sin documento'}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-[15px] text-muted">Sin entidad</p>
              )}
            </Dato>
            <Dato label="Tipo">
              <p className="text-[15px] text-ink">{salida ? 'Salida' : 'Entrada'}</p>
            </Dato>
            <Dato label="Fecha">
              <p className="text-[15px] text-ink">
                {fecha.diaMes} {fecha.anio}
              </p>
            </Dato>
          </Card>

          {/* Líneas */}
          <section aria-labelledby="remito-detalle-lineas">
            <div className="mb-3 flex items-baseline justify-between gap-3">
              <h2 id="remito-detalle-lineas" className="font-serif text-[19px] font-semibold text-ink">
                {salida ? 'Qué entregaste' : 'Qué recibiste'}
              </h2>
              <p className="text-[13px] text-muted">
                {r.detalles.length} {r.detalles.length === 1 ? 'línea' : 'líneas'}
              </p>
            </div>

            {/* Celular / tablet: tarjetas */}
            <ol className="flex flex-col gap-2.5 nav:hidden">
              {r.detalles.map((d, i) => (
                <li key={d.id} className="flex items-start gap-3 rounded-xl border border-line bg-paper p-4">
                  <Orden n={i + 1} />
                  <div className="min-w-0 flex-1">
                    <p className="text-[15px] font-semibold text-ink">{d.producto.nombre}</p>
                    <p className="text-[12.5px] text-muted tabular">
                      {cantidad(d.cantidad)} {d.producto.unidadMedida?.codigo ?? ''} ×{' '}
                      {formatMontoExacto(d.precioUnitario)}
                    </p>
                  </div>
                  <p className={`font-serif text-[17px] font-semibold text-ink tabular ${anulado ? 'line-through' : ''}`}>
                    {formatMontoExacto(d.subtotal)}
                  </p>
                </li>
              ))}
            </ol>

            {/* Escritorio: tabla */}
            <div className="hidden overflow-hidden rounded-xl border border-line bg-paper nav:block">
              <table className="w-full border-collapse text-left">
                <caption className="sr-only">Productos del remito</caption>
                <thead>
                  <tr className="border-b border-line">
                    <th scope="col" className={`w-[52px] ${TH}`}>
                      <span className="sr-only">Línea</span>
                    </th>
                    <th scope="col" className={TH}>Producto</th>
                    <th scope="col" className={`text-right ${TH}`}>Cantidad</th>
                    <th scope="col" className={`text-right ${TH}`}>Precio unitario</th>
                    <th scope="col" className={`text-right ${TH}`}>Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {r.detalles.map((d, i) => (
                    <tr key={d.id} className="border-b border-line-soft last:border-0">
                      <td className="px-5 py-[14px]">
                        <Orden n={i + 1} />
                      </td>
                      <td className="px-5 py-[14px]">
                        <p className="text-[15px] font-semibold text-ink">{d.producto.nombre}</p>
                        {d.producto.sku && <p className="text-[12.5px] text-muted">SKU {d.producto.sku}</p>}
                      </td>
                      <td className="px-5 py-[14px] text-right text-[14.5px] text-ink tabular">
                        {cantidad(d.cantidad)}{' '}
                        <span className="text-muted">{d.producto.unidadMedida?.codigo ?? ''}</span>
                      </td>
                      <td className="px-5 py-[14px] text-right text-[14.5px] text-ink tabular">
                        {formatMontoExacto(d.precioUnitario)}
                      </td>
                      <td
                        className={`px-5 py-[14px] text-right font-serif text-[17px] font-semibold text-ink tabular ${anulado ? 'line-through' : ''}`}
                      >
                        {formatMontoExacto(d.subtotal)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        {/* Resumen */}
        <aside className="mt-5 flex flex-col gap-4 xl:sticky xl:top-24 xl:mt-0">
          <Card>
            <p className="text-[12px] font-bold tracking-[0.1em] text-muted uppercase">Total del remito</p>
            <p className={`font-serif text-[36px] leading-tight font-semibold text-ink tabular ${anulado ? 'line-through opacity-55' : ''}`}>
              {formatMontoExacto(total)}
            </p>
          </Card>

          <Card>
            <p className="font-serif text-[18px] font-semibold text-ink">En la cuenta corriente</p>
            {ob && r.entidad ? (
              <div className="mt-3 flex flex-col gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge estado={obVencida ? 'vencida' : ob.estado} size="sm" />
                  <span className="text-[13.5px] text-ink-soft">
                    {ob.direccion === 'a_cobrar' ? 'Deuda a cobrar' : 'Deuda a pagar'} de{' '}
                    {formatMontoExacto(ob.monto)}
                  </span>
                </div>
                {ob.estado !== 'anulada' && (
                  <dl className="grid grid-cols-2 gap-3 rounded-lg border border-line bg-white px-4 py-3">
                    <div>
                      <dt className="text-[11.5px] font-bold tracking-[0.1em] text-muted uppercase">
                        {ob.direccion === 'a_cobrar' ? 'Cobrado' : 'Pagado'}
                      </dt>
                      <dd className="font-serif text-[17px] font-semibold text-ink tabular">
                        {formatMontoExacto(pagado)}
                      </dd>
                    </div>
                    <div className="text-right">
                      <dt className="text-[11.5px] font-bold tracking-[0.1em] text-muted uppercase">Falta</dt>
                      <dd
                        className={`font-serif text-[17px] font-semibold tabular ${falta > 0 ? (ob.direccion === 'a_cobrar' ? 'text-verde' : 'text-neg') : 'text-muted'}`}
                      >
                        {formatMontoExacto(falta)}
                      </dd>
                    </div>
                  </dl>
                )}
                {obVencida && ob.fechaVencimiento && (
                  <p className="text-[12.5px] text-warn-on-soft">
                    Venció hace {diasDesde(ob.fechaVencimiento)} días.
                  </p>
                )}
                <div className="flex flex-col gap-2">
                  {obAbierta && falta > 0 && (
                    <Link
                      href={`/cuentas/corrientes/${r.entidad.id}?accion=cobrar`}
                      className={buttonClasses('primary')}
                    >
                      {ob.direccion === 'a_cobrar' ? 'Registrar cobro' : 'Registrar pago'}
                    </Link>
                  )}
                  <Link href={`/cuentas/corrientes/${r.entidad.id}`} className={buttonClasses('secondary')}>
                    Ver cuenta de {r.entidad.nombre}
                  </Link>
                </div>
              </div>
            ) : (
              <p className="mt-2 text-[13.5px] text-ink-soft">
                {r.entidad
                  ? 'Este remito no generó movimientos en la cuenta corriente.'
                  : 'Este remito no tiene entidad, así que no generó movimientos en ninguna cuenta corriente.'}
              </p>
            )}
          </Card>
        </aside>
      </div>

      {modal && (
        <Modal title={`¿Anular el remito ${remitoTitulo(r)}?`} onClose={() => !accion.busy && setModal(false)}>
          <div className="flex flex-col gap-4">
            {anulacionBloqueada && r.entidad ? (
              <>
                <p className="text-[14.5px] text-ink-soft">
                  No se puede anular: ya tiene{' '}
                  <strong className="text-ink">{formatMontoExacto(pagado)}</strong>{' '}
                  {ob?.direccion === 'a_cobrar' ? 'cobrados' : 'pagados'}. Primero anulá{' '}
                  {ob?.direccion === 'a_cobrar' ? 'el cobro' : 'el pago'} desde la cuenta corriente de{' '}
                  {r.entidad.nombre}.
                </p>
                <div className="flex justify-end gap-2.5">
                  <Button variant="ghost" onClick={() => setModal(false)}>
                    Volver
                  </Button>
                  <Link
                    href={`/cuentas/corrientes/${r.entidad.id}?tab=pagos`}
                    className={buttonClasses('secondary')}
                  >
                    Ir a la cuenta corriente
                  </Link>
                </div>
              </>
            ) : (
              <>
                <p className="text-[14.5px] text-ink-soft">
                  {ob && ob.estado !== 'anulada' && r.entidad ? (
                    <>
                      También se anula la deuda de{' '}
                      <strong className="text-ink">{formatMontoExacto(ob.monto)}</strong> en la cuenta de{' '}
                      <strong className="text-ink">{r.entidad.nombre}</strong>, que queda compensada con un
                      ajuste.{' '}
                    </>
                  ) : null}
                  El número {r.numero ? `${r.numero} ` : ''}queda usado y no se puede deshacer.
                </p>
                {accion.error && <AlertBanner variant="error">{accion.error}</AlertBanner>}
                <div className="flex justify-end gap-2.5">
                  <Button variant="ghost" onClick={() => setModal(false)} disabled={accion.busy}>
                    Volver
                  </Button>
                  <Button variant="destructive" onClick={anular} disabled={accion.busy}>
                    {accion.busy ? 'Anulando…' : 'Anular remito'}
                  </Button>
                </div>
              </>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}

const TH = 'px-5 py-3 text-[12px] font-bold tracking-[0.1em] text-muted uppercase';

/** "12", "1,5" — sin los ceros de más que trae el decimal de la base. */
function cantidad(valor: string): string {
  return Number(valor).toLocaleString('es-AR', { maximumFractionDigits: 3 });
}

function Orden({ n }: { n: number }) {
  return (
    <span
      className="inline-flex h-[26px] w-[26px] flex-shrink-0 items-center justify-center rounded-full bg-canvas text-[12.5px] font-bold text-muted"
      aria-hidden
    >
      {n}
    </span>
  );
}

function Dato({
  label,
  className = '',
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`flex flex-col gap-[7px] ${className}`}>
      <p className="text-[13px] font-semibold text-ink-soft">{label}</p>
      {children}
    </div>
  );
}
