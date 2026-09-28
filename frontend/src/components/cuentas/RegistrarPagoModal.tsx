'use client';

import { useEffect, useMemo, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Field } from '@/components/ui/Field';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Segmented } from '@/components/ui/Segmented';
import { AlertBanner } from '@/components/ui/AlertBanner';
import { Skeleton } from '@/components/ui/Skeleton';
import { ApiError, Entidad, Obligacion, createPago, listObligaciones } from '@/lib/api';
import { formatFechaCorta, formatMonto } from '@/lib/format';
import { EntidadSelect, GASTO_GENERAL } from './EntidadSelect';

type Direccion = 'a_cobrar' | 'a_pagar';
type Medio = 'efectivo' | 'transferencia' | 'cheque';

const redondear = (n: number) => Math.round(n * 100) / 100;
const esAbierta = (o: Obligacion) => (o.estado === 'pendiente' || o.estado === 'parcial') && o.saldo > 0;

/**
 * Reparte `monto` entre las obligaciones empezando por la que vence antes
 * (las sin vencimiento al final). Es solo una sugerencia editable -- la
 * regla de negocio (no pasarse del saldo de cada una, ni del total del
 * pago) la sigue validando el backend.
 */
function repartir(monto: number, obligaciones: Obligacion[]): Record<string, string> {
  let resto = monto;
  const out: Record<string, string> = {};
  for (const o of obligaciones) {
    const aplicar = redondear(Math.max(0, Math.min(resto, o.saldo)));
    out[o.id] = aplicar > 0 ? String(aplicar) : '';
    resto = redondear(resto - aplicar);
  }
  return out;
}

/**
 * Dos modos: con `entidad` fija + sus `obligaciones` (desde la cuenta
 * corriente) o con `entidades` para elegir con quién fue, incluido "gasto
 * general" sin entidad (desde el resumen de Cuentas).
 */
export function RegistrarPagoModal({
  entidad,
  obligaciones: obligacionesIniciales,
  entidades,
  direccionInicial = 'a_cobrar',
  onClose,
  onCreated,
}: {
  entidad?: { id: string; nombre: string };
  obligaciones?: Obligacion[];
  entidades?: Entidad[];
  direccionInicial?: Direccion;
  onClose: () => void;
  onCreated: () => void;
}) {
  const conSelector = !entidad;
  const [seleccion, setSeleccion] = useState(entidad?.id ?? '');
  const [obligaciones, setObligaciones] = useState<Obligacion[]>(obligacionesIniciales ?? []);
  const [cargandoObligaciones, setCargandoObligaciones] = useState(false);
  const [direccion, setDireccion] = useState<Direccion>(direccionInicial);
  const [monto, setMonto] = useState('');
  const [medio, setMedio] = useState<Medio>('transferencia');
  const [cheque, setCheque] = useState({ numero: '', banco: '', fechaCobro: '' });
  const [aplicaciones, setAplicaciones] = useState<Record<string, string>>({});
  const [editadoAMano, setEditadoAMano] = useState(false);
  const [errores, setErrores] = useState<{ monto?: string; entidad?: string }>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const esGasto = seleccion === GASTO_GENERAL;
  const nombre = entidad?.nombre ?? entidades?.find((e) => e.id === seleccion)?.nombre ?? null;

  // Modo selector: al elegir con quién, traer sus deudas abiertas.
  useEffect(() => {
    if (!conSelector || !seleccion) return;
    let cancelado = false;
    setCargandoObligaciones(true);
    listObligaciones({
      ...(seleccion === GASTO_GENERAL ? { sinEntidad: true } : { entidadId: seleccion }),
      estado: 'abiertas',
      take: 100,
    })
      .then((res) => {
        if (cancelado) return;
        setObligaciones(res.data);
        const hayACobrar = res.data.some((o) => o.direccion === 'a_cobrar' && esAbierta(o));
        const hayAPagar = res.data.some((o) => o.direccion === 'a_pagar' && esAbierta(o));
        setDireccion(seleccion === GASTO_GENERAL || (!hayACobrar && hayAPagar) ? 'a_pagar' : 'a_cobrar');
      })
      .catch(() => !cancelado && setObligaciones([]))
      .finally(() => !cancelado && setCargandoObligaciones(false));
    setAplicaciones({});
    setEditadoAMano(false);
    setMonto('');
    return () => {
      cancelado = true;
    };
  }, [conSelector, seleccion]);

  const abiertas = useMemo(
    () =>
      obligaciones
        .filter((o) => o.direccion === direccion && esAbierta(o))
        .sort((a, b) => {
          const fa = a.fechaVencimiento ? Date.parse(a.fechaVencimiento) : Number.POSITIVE_INFINITY;
          const fb = b.fechaVencimiento ? Date.parse(b.fechaVencimiento) : Number.POSITIVE_INFINITY;
          return fa - fb;
        }),
    [obligaciones, direccion],
  );

  const esCobro = direccion === 'a_cobrar';
  const montoNum = Number(monto) || 0;
  const totalAplicado = redondear(abiertas.reduce((s, o) => s + (Number(aplicaciones[o.id]) || 0), 0));
  const sinAplicar = redondear(montoNum - totalAplicado);
  const excedidas = abiertas.filter((o) => (Number(aplicaciones[o.id]) || 0) > o.saldo + 0.005);

  function cambiarMonto(valor: string) {
    setMonto(valor);
    if (!editadoAMano) setAplicaciones(repartir(Number(valor) || 0, abiertas));
  }

  function cambiarDireccion(d: Direccion) {
    setDireccion(d);
    setEditadoAMano(false);
    setAplicaciones({});
    setMonto('');
  }

  function cambiarAplicacion(id: string, valor: string) {
    setEditadoAMano(true);
    setAplicaciones((prev) => ({ ...prev, [id]: valor }));
  }

  function validar(): boolean {
    const nuevos = {
      monto: montoNum > 0 ? undefined : 'Poné un monto mayor a cero',
      entidad: conSelector && !seleccion ? 'Elegí con quién fue, o "gasto general"' : undefined,
    };
    setErrores(nuevos);
    return !nuevos.monto && !nuevos.entidad && totalAplicado <= montoNum + 0.005 && excedidas.length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validar()) return;
    setBusy(true);
    setError(null);
    try {
      await createPago({
        entidadId: esGasto ? undefined : seleccion,
        monto: montoNum,
        medio,
        aplicaciones: abiertas
          .map((o) => ({ obligacionId: o.id, monto: redondear(Number(aplicaciones[o.id]) || 0) }))
          .filter((a) => a.monto > 0),
        cheques:
          medio === 'cheque'
            ? [
                {
                  numero: cheque.numero || undefined,
                  banco: cheque.banco || undefined,
                  fechaCobro: cheque.fechaCobro || undefined,
                  monto: montoNum,
                },
              ]
            : undefined,
      });
      onCreated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error de conexión');
    } finally {
      setBusy(false);
    }
  }

  const labelMonto = esGasto
    ? esCobro
      ? '¿Cuánto cobraste?'
      : '¿Cuánto pagaste?'
    : esCobro
      ? `¿Cuánto te pagó ${nombre ?? 'la entidad'}?`
      : `¿Cuánto le pagaste a ${nombre ?? 'la entidad'}?`;

  return (
    <Modal title={esCobro ? 'Registrar cobro' : 'Registrar pago'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        {conSelector && (
          <Field label="¿Con quién fue?" htmlFor="pago-entidad" error={errores.entidad}>
            <EntidadSelect
              id="pago-entidad"
              entidades={entidades ?? []}
              value={seleccion}
              onChange={setSeleccion}
              error={!!errores.entidad}
            />
          </Field>
        )}

        {(!conSelector || seleccion) && (
          <>
            <Segmented
              label="Tipo de movimiento"
              options={
                esGasto
                  ? [
                      { value: 'a_pagar', label: 'Pagaste' },
                      { value: 'a_cobrar', label: 'Cobraste' },
                    ]
                  : [
                      { value: 'a_cobrar', label: 'Te pagó' },
                      { value: 'a_pagar', label: 'Le pagaste' },
                    ]
              }
              value={direccion}
              onChange={cambiarDireccion}
            />

            <Field label={labelMonto} htmlFor="pago-monto" error={errores.monto}>
              <Input
                id="pago-monto"
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0.01"
                value={monto}
                error={!!errores.monto}
                onChange={(e) => cambiarMonto(e.target.value)}
                onBlur={() => monto && validar()}
              />
            </Field>

            <div className="flex flex-col gap-[7px]">
              <p className="text-[13px] font-semibold text-ink-soft">Medio</p>
              <Segmented
                label="Medio de pago"
                size="sm"
                options={[
                  { value: 'transferencia', label: 'Transferencia' },
                  { value: 'efectivo', label: 'Efectivo' },
                  { value: 'cheque', label: 'Cheque' },
                ]}
                value={medio}
                onChange={setMedio}
              />
            </div>

            {medio === 'cheque' && (
              <div className="grid gap-3 rounded-xl border border-terra-soft-border bg-terra-soft p-3.5 sm:grid-cols-3">
                <Field label="Nº de cheque" htmlFor="ch-num">
                  <Input id="ch-num" value={cheque.numero} onChange={(e) => setCheque({ ...cheque, numero: e.target.value })} />
                </Field>
                <Field label="Banco" htmlFor="ch-banco">
                  <Input id="ch-banco" value={cheque.banco} onChange={(e) => setCheque({ ...cheque, banco: e.target.value })} />
                </Field>
                <Field label="Se cobra el" htmlFor="ch-fecha">
                  <Input
                    id="ch-fecha"
                    type="date"
                    value={cheque.fechaCobro}
                    onChange={(e) => setCheque({ ...cheque, fechaCobro: e.target.value })}
                  />
                </Field>
              </div>
            )}

            <div className="flex flex-col gap-2">
              <p className="text-[13px] font-semibold text-ink-soft">
                {esCobro ? '¿Qué deudas cancela?' : '¿Qué deudas pagás?'}
              </p>
              {cargandoObligaciones ? (
                <Skeleton className="h-16 w-full rounded-xl" />
              ) : abiertas.length === 0 ? (
                <AlertBanner variant="warn">
                  No hay deudas abiertas en esta dirección. Se registra igual, pero no descuenta de
                  ninguna obligación{esGasto ? '' : ' ni mueve la cuenta corriente'}.
                </AlertBanner>
              ) : (
                <>
                  {!editadoAMano && montoNum > 0 && (
                    <p className="text-[12.5px] text-muted">
                      Lo repartimos empezando por la que vence antes. Podés cambiarlo.
                    </p>
                  )}
                  <ul className="flex flex-col gap-2">
                    {abiertas.map((o) => {
                      const excedida = excedidas.includes(o);
                      return (
                        <li key={o.id} className="flex items-end gap-3 rounded-xl border border-line bg-paper p-3">
                          <div className="min-w-0 flex-1 pb-2.5">
                            <p className="truncate text-[14px] font-semibold text-ink">
                              {o.descripcion ?? o.tipo ?? 'Obligación'}
                            </p>
                            <p className="text-[12px] text-muted">
                              Debe {formatMonto(o.saldo, { centavos: true })}
                              {o.fechaVencimiento && ` · vence ${formatFechaCorta(o.fechaVencimiento)}`}
                            </p>
                          </div>
                          <div className="w-32 flex-shrink-0">
                            <Field
                              label="Aplicar"
                              htmlFor={`apl-${o.id}`}
                              error={excedida ? 'Más que lo que debe' : undefined}
                            >
                              <Input
                                id={`apl-${o.id}`}
                                type="number"
                                inputMode="decimal"
                                step="0.01"
                                min="0"
                                value={aplicaciones[o.id] ?? ''}
                                error={excedida}
                                onChange={(e) => cambiarAplicacion(o.id, e.target.value)}
                              />
                            </Field>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                  {montoNum > 0 && totalAplicado > montoNum + 0.005 && (
                    <AlertBanner variant="error">
                      Estás aplicando {formatMonto(totalAplicado, { centavos: true })}, más que el total
                      del {esCobro ? 'cobro' : 'pago'} ({formatMonto(montoNum, { centavos: true })}).
                    </AlertBanner>
                  )}
                  {montoNum > 0 && sinAplicar > 0.005 && (
                    <p className="text-[12.5px] text-muted" aria-live="polite">
                      Quedan {formatMonto(sinAplicar, { centavos: true })} sin aplicar a ninguna deuda.
                    </p>
                  )}
                </>
              )}
            </div>
          </>
        )}

        {error && <AlertBanner variant="error">{error}</AlertBanner>}

        <div className="mt-1 flex justify-end gap-2.5">
          <Button type="button" variant="ghost" onClick={onClose}>
            Descartar
          </Button>
          <Button type="submit" disabled={busy}>
            {busy ? 'Guardando…' : esCobro ? 'Registrar cobro' : 'Registrar pago'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
