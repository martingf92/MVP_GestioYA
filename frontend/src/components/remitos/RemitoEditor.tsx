'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronRight, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Field } from '@/components/ui/Field';
import { Input } from '@/components/ui/Input';
import { Segmented } from '@/components/ui/Segmented';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Avatar } from '@/components/ui/Avatar';
import { AlertBanner } from '@/components/ui/AlertBanner';
import { ErrorState } from '@/components/ui/ErrorState';
import { Skeleton } from '@/components/ui/Skeleton';
import { Modal } from '@/components/ui/Modal';
import { SearchCombo, normalizar } from '@/components/ui/SearchCombo';
import {
  ApiError,
  DetalleRemitoInput,
  Entidad,
  Obligacion,
  Producto,
  Remito,
  clearSession,
  createRemito,
  deleteRemitoBorrador,
  emitirRemito,
  listEntidades,
  listObligaciones,
  listProductos,
  updateRemito,
} from '@/lib/api';
import { diasDesde, formatMontoExacto, formatSaldo } from '@/lib/format';

type Tipo = 'S' | 'E';

interface Linea {
  key: string;
  productoId: string;
  cantidad: string;
  precio: string;
}

type EstadoGuardado =
  | { tipo: 'nuevo' }
  | { tipo: 'guardando' }
  | { tipo: 'guardado'; hora: Date }
  | { tipo: 'error'; mensaje: string };

const AUTOSAVE_MS = 2000;
// Mismo límite que el backend (OBSERVACIONES_MAX en create-remito.dto.ts).
const OBSERVACIONES_MAX = 500;

let contadorLineas = 0;
function nuevaLinea(): Linea {
  contadorLineas += 1;
  return { key: `l${contadorLineas}`, productoId: '', cantidad: '1', precio: '' };
}

/** Acepta coma decimal ("1,5"). NaN si está vacío o no es número. */
function num(s: string): number {
  return s.trim() === '' ? NaN : Number(s.replace(',', '.'));
}

function lineaCompleta(l: Linea): boolean {
  return l.productoId !== '' && num(l.cantidad) > 0 && num(l.precio) >= 0;
}

function subtotal(l: Linea): number {
  const c = num(l.cantidad);
  const p = num(l.precio);
  return Number.isFinite(c) && Number.isFinite(p) ? c * p : 0;
}

/** YYYY-MM-DD en hora local. */
function fechaLocal(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/**
 * La fecha elegida con la hora actual: mandar solo "2026-09-29" el backend lo
 * toma como medianoche UTC, que en Argentina es el día anterior.
 */
function fechaParaApi(fecha: string): string {
  const [y, m, d] = fecha.split('-').map(Number);
  const ahora = new Date();
  return new Date(y, m - 1, d, ahora.getHours(), ahora.getMinutes(), ahora.getSeconds()).toISOString();
}

function horaCorta(d: Date): string {
  return d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
}

/** Una compra se carga por costo; una venta, por precio de venta. */
function precioSugerido(p: Producto, tipo: Tipo): string {
  const valor = tipo === 'E' && Number(p.costo) > 0 ? p.costo : p.precioUnitario;
  return String(Number(valor));
}

export function RemitoEditor({
  inicial,
  onEmitido,
}: {
  inicial?: Remito;
  onEmitido: (remito: Remito) => void;
}) {
  const router = useRouter();

  const [entidades, setEntidades] = useState<Entidad[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [carga, setCarga] = useState<'loading' | 'error' | 'ready'>('loading');

  const [remitoId, setRemitoId] = useState<string | null>(inicial?.id ?? null);
  const [tipo, setTipo] = useState<Tipo>(inicial?.tipo ?? 'S');
  const [entidadId, setEntidadId] = useState(inicial?.entidadId ?? '');
  const fechaInicial = inicial ? fechaLocal(new Date(inicial.fecha)) : fechaLocal(new Date());
  const [fecha, setFecha] = useState(fechaInicial);
  const [observaciones, setObservaciones] = useState(inicial?.observaciones ?? '');
  const [lineas, setLineas] = useState<Linea[]>(() =>
    inicial && inicial.detalles.length > 0
      ? inicial.detalles.map((d) => ({
          ...nuevaLinea(),
          productoId: d.productoId,
          cantidad: String(Number(d.cantidad)),
          precio: String(Number(d.precioUnitario)),
        }))
      : [nuevaLinea()],
  );
  const [tocadas, setTocadas] = useState<Set<string>>(new Set());
  const [guardado, setGuardado] = useState<EstadoGuardado>(
    inicial ? { tipo: 'guardado', hora: new Date() } : { tipo: 'nuevo' },
  );
  const [pendiente, setPendiente] = useState(false);
  const [modal, setModal] = useState<'emitir' | 'descartar' | null>(null);
  const [accion, setAccion] = useState<{ busy: boolean; error: string | null }>({ busy: false, error: null });
  const [vencidas, setVencidas] = useState<Obligacion[]>([]);

  const productoRefs = useRef(new Map<string, HTMLInputElement>());
  const [enfocar, setEnfocar] = useState<string | null>(null);

  // ---------- Carga de entidades y productos ----------

  const cargar = useCallback(async () => {
    setCarga('loading');
    try {
      const [ents, prods] = await Promise.all([
        listEntidades({ activo: true, orderBy: 'nombre', orderDir: 'asc', take: 100 }),
        listProductos({ activo: true, take: 100 }),
      ]);
      setEntidades(ents.data);
      setProductos(prods.data);
      setCarga('ready');
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        clearSession();
        router.push('/login');
        return;
      }
      setCarga('error');
    }
  }, [router]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const entidad = entidades.find((e) => e.id === entidadId) ?? null;

  // Deudas vencidas de la entidad, en la dirección del remito (una venta
  // mira lo que te debe; una compra, lo que le debés). Informativo.
  useEffect(() => {
    if (!entidadId) {
      setVencidas([]);
      return;
    }
    let vigente = true;
    listObligaciones({ entidadId, estado: 'abiertas' })
      .then((res) => {
        if (vigente) setVencidas(res.data.filter((o) => o.vencida));
      })
      .catch(() => {
        if (vigente) setVencidas([]);
      });
    return () => {
      vigente = false;
    };
  }, [entidadId]);

  // ---------- Autoguardado ----------

  // Estado más reciente para el guardado, que corre fuera del render.
  const estadoRef = useRef({ remitoId, tipo, entidadId, fecha, observaciones, lineas });
  useLayoutEffect(() => {
    estadoRef.current = { remitoId, tipo, entidadId, fecha, observaciones, lineas };
  });
  // Los guardados se encadenan: nunca corren dos a la vez (el primero crea
  // el remito y los siguientes necesitan su id).
  const cadenaRef = useRef<Promise<boolean>>(Promise.resolve(true));
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const guardar = useCallback((): Promise<boolean> => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    cadenaRef.current = cadenaRef.current.then(async () => {
      const s = estadoRef.current;
      const detalles: DetalleRemitoInput[] = s.lineas.filter(lineaCompleta).map((l) => ({
        productoId: l.productoId,
        cantidad: num(l.cantidad),
        precioUnitario: num(l.precio),
      }));
      // El backend exige al menos una línea completa para crear el borrador.
      if (!s.remitoId && detalles.length === 0) {
        setPendiente(false);
        return false;
      }
      setGuardado({ tipo: 'guardando' });
      try {
        if (!s.remitoId) {
          const creado = await createRemito({
            tipo: s.tipo,
            entidadId: s.entidadId || undefined,
            fecha: fechaParaApi(s.fecha),
            observaciones: s.observaciones || undefined,
            detalles,
          });
          setRemitoId(creado.id);
          estadoRef.current.remitoId = creado.id;
          // Desde acá la dirección es la del borrador: si se recarga la
          // página, se sigue editando el mismo.
          window.history.replaceState(null, '', `/remitos/${creado.id}`);
        } else {
          await updateRemito(s.remitoId, {
            tipo: s.tipo,
            entidadId: s.entidadId || null,
            fecha: s.fecha !== fechaInicial ? fechaParaApi(s.fecha) : undefined,
            observaciones: s.observaciones,
            detalles: detalles.length > 0 ? detalles : undefined,
          });
        }
        setGuardado({ tipo: 'guardado', hora: new Date() });
        setPendiente(false);
        return true;
      } catch (err) {
        setGuardado({
          tipo: 'error',
          mensaje:
            err instanceof ApiError && err.status === 401
              ? 'Se venció la sesión. No cierres esta pestaña: volvé a entrar en otra y reintentá.'
              : err instanceof ApiError
                ? err.message
                : 'Se cortó la conexión.',
        });
        return false;
      }
    });
    return cadenaRef.current;
  }, [fechaInicial]);

  function cambiar() {
    setPendiente(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      guardar();
    }, AUTOSAVE_MS);
  }

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  // Aviso del navegador si se cierra la pestaña con cambios sin guardar.
  useEffect(() => {
    if (!pendiente) return;
    const onUnload = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', onUnload);
    return () => window.removeEventListener('beforeunload', onUnload);
  }, [pendiente]);

  // ---------- Edición ----------

  function actualizarLinea(key: string, patch: Partial<Linea>) {
    setLineas((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));
    cambiar();
  }

  function elegirProducto(key: string, p: Producto) {
    actualizarLinea(key, { productoId: p.id, precio: precioSugerido(p, tipo) });
  }

  function agregarLinea() {
    const l = nuevaLinea();
    setLineas((prev) => [...prev, l]);
    setEnfocar(l.key);
  }

  function quitarLinea(key: string) {
    setLineas((prev) => prev.filter((l) => l.key !== key));
    cambiar();
  }

  function tocar(key: string) {
    setTocadas((prev) => (prev.has(key) ? prev : new Set(prev).add(key)));
  }

  useEffect(() => {
    if (!enfocar) return;
    productoRefs.current.get(enfocar)?.focus();
    setEnfocar(null);
  }, [enfocar]);

  // ---------- Derivados ----------

  const total = lineas.reduce((acc, l) => acc + subtotal(l), 0);
  const productoDe = (l: Linea) => productos.find((p) => p.id === l.productoId) ?? null;
  const unidades = new Set(lineas.filter((l) => l.productoId).map((l) => productoDe(l)?.unidadMedida?.codigo));
  const cantidadTotal = lineas.reduce((acc, l) => acc + (num(l.cantidad) > 0 ? num(l.cantidad) : 0), 0);
  const resumenLineas =
    `${lineas.length} ${lineas.length === 1 ? 'línea' : 'líneas'}` +
    (unidades.size === 1 && cantidadTotal > 0
      ? ` · ${Number(cantidadTotal.toFixed(3)).toLocaleString('es-AR')} ${[...unidades][0] ?? ''}`
      : '');

  const faltantes: string[] = [];
  if (!entidadId) faltantes.push(tipo === 'S' ? 'elegir a quién le entregás' : 'elegir quién te entrega');
  if (!fecha) faltantes.push('poner la fecha');
  if (lineas.length === 0) faltantes.push('agregar al menos un producto');
  lineas.forEach((l, i) => {
    if (!lineaCompleta(l)) faltantes.push(`completar la línea ${i + 1}`);
  });
  const puedeEmitir = faltantes.length === 0;
  const motivo = puedeEmitir ? '' : `Para emitir falta ${faltantes.join(', ')}.`;

  const saldoActual = Number(entidad?.cuentaCorriente?.saldoActual ?? 0);
  const saldoNuevo = saldoActual + (tipo === 'S' ? total : -total);
  const direccionVencida = tipo === 'S' ? 'a_cobrar' : 'a_pagar';
  const vencidasDir = vencidas.filter((o) => o.direccion === direccionVencida);
  const montoVencido = vencidasDir.reduce((acc, o) => acc + o.saldo, 0);
  const diasVencido = vencidasDir.reduce(
    (max, o) => (o.fechaVencimiento ? Math.max(max, diasDesde(o.fechaVencimiento)) : max),
    0,
  );

  // ---------- Acciones ----------

  async function guardarBorrador() {
    setAccion({ busy: true, error: null });
    const ok = await guardar();
    if (ok) {
      router.push('/remitos');
      return;
    }
    setAccion({
      busy: false,
      error: estadoRef.current.remitoId
        ? 'No se pudo guardar. Revisá la conexión y probá de nuevo.'
        : 'Para guardar el borrador completá al menos un producto con cantidad y precio.',
    });
  }

  async function descartar() {
    setAccion({ busy: true, error: null });
    if (timerRef.current) clearTimeout(timerRef.current);
    await cadenaRef.current; // si había un guardado en curso, que termine
    const id = estadoRef.current.remitoId;
    try {
      if (id) await deleteRemitoBorrador(id);
      setPendiente(false);
      router.push('/remitos');
    } catch (err) {
      setAccion({ busy: false, error: err instanceof ApiError ? err.message : 'Se cortó la conexión.' });
    }
  }

  function pedirDescartar() {
    const hayAlgo = remitoId || entidadId || observaciones.trim() || lineas.some((l) => l.productoId);
    if (hayAlgo) setModal('descartar');
    else router.push('/remitos');
  }

  async function emitir() {
    setAccion({ busy: true, error: null });
    const ok = await guardar();
    const id = estadoRef.current.remitoId;
    if (!ok || !id) {
      setAccion({ busy: false, error: 'No se pudo guardar el remito antes de emitirlo. Probá de nuevo.' });
      return;
    }
    try {
      const emitido = await emitirRemito(id);
      setPendiente(false);
      onEmitido(emitido);
    } catch (err) {
      setAccion({ busy: false, error: err instanceof ApiError ? err.message : 'Se cortó la conexión.' });
    }
  }

  // ---------- Render ----------

  if (carga === 'loading') return <EditorSkeleton />;
  if (carga === 'error') return <ErrorState onRetry={cargar} />;

  const titulo = tipo === 'S' ? 'Remito de salida' : 'Remito de entrada';

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
            <span className="text-ink-soft">{inicial ? 'Borrador' : 'Nuevo'}</span>
          </nav>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <h1 className="font-serif text-[22px] font-semibold text-ink">{titulo}</h1>
            <StatusBadge estado="borrador" size="sm" />
            <IndicadorGuardado estado={guardado} pendiente={pendiente} onReintentar={guardar} />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <Button variant="ghost" onClick={pedirDescartar} disabled={accion.busy}>
            Descartar
          </Button>
          <Button variant="secondary" onClick={guardarBorrador} disabled={accion.busy}>
            Guardar borrador
          </Button>
          {/* Debajo de xl, Emitir vive en la barra fija de abajo. */}
          <span className="hidden xl:block">
            <Button
              onClick={() => setModal('emitir')}
              disabled={!puedeEmitir || accion.busy}
              title={motivo || undefined}
            >
              Emitir
            </Button>
          </span>
        </div>
      </div>

      {accion.error && (
        <AlertBanner variant="error" className="mb-4">
          {accion.error}
        </AlertBanner>
      )}

      <div className="xl:grid xl:grid-cols-[minmax(0,1fr)_340px] xl:items-start xl:gap-6">
        <div className="flex flex-col gap-5">
          {/* Cabecera del documento */}
          <Card className="grid gap-4 nav:grid-cols-[2fr_1.2fr_1fr]">
            <Field label={tipo === 'S' ? '¿A quién le entregás?' : '¿Quién te entrega?'} htmlFor="remito-entidad">
              <SearchCombo<Entidad>
                id="remito-entidad"
                items={entidades}
                selected={entidad}
                getKey={(e) => e.id}
                getLabel={(e) => e.nombre}
                matches={(e, q) => normalizar(e.nombre).includes(q) || (e.documentoNro ?? '').includes(q)}
                onSelect={(e) => {
                  setEntidadId(e.id);
                  cambiar();
                }}
                placeholder="Buscá por nombre o CUIT…"
                emptyText="No hay entidades con ese nombre."
                renderOption={(e) => (
                  <div className="flex items-center gap-2.5">
                    <Avatar nombre={e.nombre} tono={e.proveedor ? 'terra' : 'verde'} />
                    <div className="min-w-0">
                      <p className="truncate text-[14.5px] font-semibold text-ink">{e.nombre}</p>
                      <p className="truncate text-[12.5px] text-muted">
                        {rolesTexto(e)}
                        {e.documentoNro ? ` · ${e.documentoNro}` : ''}
                      </p>
                    </div>
                  </div>
                )}
              />
            </Field>
            <div className="flex flex-col gap-[7px]">
              <span className="text-[13px] font-semibold text-ink-soft">Tipo de movimiento</span>
              <Segmented<Tipo>
                label="Tipo de movimiento"
                value={tipo}
                onChange={(v) => {
                  setTipo(v);
                  cambiar();
                }}
                options={[
                  { value: 'S', label: 'Salida' },
                  { value: 'E', label: 'Entrada' },
                ]}
              />
            </div>
            <Field label="Fecha" htmlFor="remito-fecha" error={!fecha ? 'Poné la fecha del remito' : undefined}>
              <Input
                id="remito-fecha"
                type="date"
                value={fecha}
                error={!fecha}
                onChange={(e) => {
                  setFecha(e.target.value);
                  cambiar();
                }}
              />
            </Field>
          </Card>

          {/* Líneas */}
          <section aria-labelledby="remito-lineas">
            <div className="mb-3 flex items-baseline justify-between gap-3">
              <h2 id="remito-lineas" className="font-serif text-[19px] font-semibold text-ink">
                {tipo === 'S' ? 'Qué entregás' : 'Qué recibís'}
              </h2>
              <p className="text-[13px] text-muted">{resumenLineas}</p>
            </div>

            {productos.length === 0 && (
              <AlertBanner variant="warn" className="mb-3">
                Todavía no hay productos cargados. <Link href="/productos">Cargá el primero</Link> para poder
                armar el remito.
              </AlertBanner>
            )}

            <ol className="flex flex-col gap-2.5">
              {lineas.map((l, i) => (
                <LineaCard
                  key={l.key}
                  linea={l}
                  orden={i + 1}
                  productos={productos}
                  producto={productoDe(l)}
                  mostrarErrores={tocadas.has(l.key)}
                  inputRef={(el) => {
                    if (el) productoRefs.current.set(l.key, el);
                    else productoRefs.current.delete(l.key);
                  }}
                  onProducto={(p) => elegirProducto(l.key, p)}
                  onCambio={(patch) => actualizarLinea(l.key, patch)}
                  onTocar={() => tocar(l.key)}
                  onQuitar={() => quitarLinea(l.key)}
                />
              ))}
            </ol>

            <button
              type="button"
              onClick={agregarLinea}
              className="group mt-2.5 flex w-full items-center gap-3 rounded-xl border-[1.5px] border-dashed border-[#C4B69F] p-4 text-left transition-colors duration-[120ms] ease-out hover:border-verde hover:bg-[#F7FBF8]"
            >
              <span className="inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-verde-soft text-verde-on-soft">
                <Plus className="h-4 w-4" aria-hidden />
              </span>
              <span>
                <span className="block text-[14.5px] font-semibold text-ink">
                  {lineas.length === 0 ? 'Agregar un producto' : 'Agregar otro producto'}
                </span>
                <span className="block text-[12.5px] text-muted">Buscá por nombre o SKU</span>
              </span>
            </button>
          </section>
        </div>

        {/* Resumen */}
        <aside className="mt-5 flex flex-col gap-4 xl:sticky xl:top-24 xl:mt-0">
          <Card>
            <div className="flex items-baseline justify-between text-[13.5px] text-ink-soft">
              <span>Subtotal</span>
              <span className="tabular">{formatMontoExacto(total)}</span>
            </div>
            <p className="mt-3 text-[12px] font-bold tracking-[0.1em] text-muted uppercase">Total del remito</p>
            <p className="font-serif text-[36px] leading-tight font-semibold text-ink tabular" aria-live="polite">
              {formatMontoExacto(total)}
            </p>
          </Card>

          <ImpactoCuenta
            tipo={tipo}
            entidad={entidad}
            total={total}
            saldoActual={saldoActual}
            saldoNuevo={saldoNuevo}
          />

          {entidad && montoVencido > 0 && (
            <AlertBanner variant="warn">
              Ojo:{' '}
              {tipo === 'S' ? (
                <>
                  {entidad.nombre} ya te debe <strong>{formatMontoExacto(montoVencido)} vencidos</strong>
                </>
              ) : (
                <>
                  ya le debés <strong>{formatMontoExacto(montoVencido)} vencidos</strong> a {entidad.nombre}
                </>
              )}
              {diasVencido > 0 ? ` hace ${diasVencido} ${diasVencido === 1 ? 'día' : 'días'}` : ''}. Podés emitir
              igual.
            </AlertBanner>
          )}

          <Field label="Observaciones (opcional)" htmlFor="remito-obs">
            <textarea
              id="remito-obs"
              rows={3}
              maxLength={OBSERVACIONES_MAX}
              value={observaciones}
              onChange={(e) => {
                setObservaciones(e.target.value);
                cambiar();
              }}
              placeholder="Horario de entrega, quién recibe, estado de la mercadería…"
              aria-describedby="remito-obs-ayuda"
              className="w-full resize-y rounded-[10px] border border-input-border bg-white px-[15px] py-[12px] text-[15px] text-ink placeholder:text-placeholder focus-visible:outline-none"
            />
            <p id="remito-obs-ayuda" className="flex justify-between gap-3 text-[12px] text-muted">
              <span>Salen impresas en el PDF.</span>
              <span className="tabular">
                {observaciones.length}/{OBSERVACIONES_MAX}
              </span>
            </p>
          </Field>

          {/* En pantalla grande el motivo va bajo el resumen; en chica, en la barra fija. */}
          {!puedeEmitir && <p className="hidden text-[12.5px] text-muted xl:block">{motivo}</p>}
        </aside>
      </div>

      {/* Barra fija con total + Emitir, debajo de xl */}
      <div className="h-28 xl:hidden" aria-hidden />
      <div className="fixed inset-x-0 bottom-16 z-20 border-t border-line bg-paper px-4 py-3 nav:bottom-0 nav:px-7 xl:hidden">
        <div className="mx-auto flex max-w-[1400px] items-center gap-4">
          <div className="min-w-0 flex-1">
            <p className="font-serif text-[22px] leading-tight font-semibold text-ink tabular">
              {formatMontoExacto(total)}
            </p>
            <p className="truncate text-[12px] text-muted">{puedeEmitir ? resumenLineas : motivo}</p>
          </div>
          <Button onClick={() => setModal('emitir')} disabled={!puedeEmitir || accion.busy}>
            Emitir
          </Button>
        </div>
      </div>

      {modal === 'emitir' && entidad && (
        <Modal title="¿Emitir el remito?" onClose={() => !accion.busy && setModal(null)}>
          <div className="flex flex-col gap-4">
            <p className="text-[14.5px] text-ink-soft">
              {tipo === 'S' ? (
                <>
                  Esto le va a cargar <strong className="text-ink">{formatMontoExacto(total)}</strong> a la cuenta de{' '}
                  <strong className="text-ink">{entidad.nombre}</strong>
                </>
              ) : (
                <>
                  Esto va a sumar <strong className="text-ink">{formatMontoExacto(total)}</strong> a lo que le debés a{' '}
                  <strong className="text-ink">{entidad.nombre}</strong>
                </>
              )}{' '}
              y ya no vas a poder editar el remito (solo anularlo).
            </p>
            <TransicionSaldo saldoActual={saldoActual} saldoNuevo={saldoNuevo} />
            {accion.error && <AlertBanner variant="error">{accion.error}</AlertBanner>}
            <div className="flex justify-end gap-2.5">
              <Button variant="ghost" onClick={() => setModal(null)} disabled={accion.busy}>
                Volver
              </Button>
              <Button onClick={emitir} disabled={accion.busy}>
                {accion.busy ? 'Emitiendo…' : 'Emitir'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {modal === 'descartar' && (
        <Modal title="¿Descartar este borrador?" onClose={() => !accion.busy && setModal(null)}>
          <div className="flex flex-col gap-4">
            <p className="text-[14.5px] text-ink-soft">
              Se borra todo lo que cargaste en este remito y no se puede recuperar.
            </p>
            {accion.error && <AlertBanner variant="error">{accion.error}</AlertBanner>}
            <div className="flex justify-end gap-2.5">
              <Button variant="ghost" onClick={() => setModal(null)} disabled={accion.busy}>
                Volver
              </Button>
              <Button variant="destructive" onClick={descartar} disabled={accion.busy}>
                {accion.busy ? 'Descartando…' : 'Descartar borrador'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function rolesTexto(e: Entidad): string {
  const roles = [e.cliente && 'Cliente', e.proveedor && 'Proveedor', e.acreedor && 'Acreedor'].filter(Boolean);
  return roles.length > 0 ? roles.join(' y ') : 'Sin rol';
}

function IndicadorGuardado({
  estado,
  pendiente,
  onReintentar,
}: {
  estado: EstadoGuardado;
  pendiente: boolean;
  onReintentar: () => void;
}) {
  let texto: React.ReactNode;
  if (estado.tipo === 'guardando') texto = 'Guardando…';
  else if (estado.tipo === 'error')
    texto = (
      <span className="text-neg">
        No se pudo guardar: {estado.mensaje}{' '}
        <button type="button" onClick={onReintentar} className="font-semibold underline">
          Reintentar
        </button>
      </span>
    );
  else if (estado.tipo === 'guardado') texto = `Se guarda solo · ${horaCorta(estado.hora)}`;
  else texto = pendiente ? 'Se guarda cuando completes un producto' : 'Se guarda solo';

  return (
    <p className="text-[13px] text-muted" aria-live="polite">
      {texto}
    </p>
  );
}

// Sin las flechitas de los campos numéricos: se pisan con la unidad y en el
// celular no sirven (se escribe con el teclado numérico).
const SIN_FLECHAS =
  '[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none';

function LineaCard({
  linea,
  orden,
  productos,
  producto,
  mostrarErrores,
  inputRef,
  onProducto,
  onCambio,
  onTocar,
  onQuitar,
}: {
  linea: Linea;
  orden: number;
  productos: Producto[];
  producto: Producto | null;
  mostrarErrores: boolean;
  inputRef: (el: HTMLInputElement | null) => void;
  onProducto: (p: Producto) => void;
  onCambio: (patch: Partial<Linea>) => void;
  onTocar: () => void;
  onQuitar: () => void;
}) {
  const id = `linea-${linea.key}`;
  const errProducto = mostrarErrores && !linea.productoId ? 'Elegí un producto' : undefined;
  const errCantidad = mostrarErrores && !(num(linea.cantidad) > 0) ? 'Tiene que ser mayor a 0' : undefined;
  const errPrecio = mostrarErrores && !(num(linea.precio) >= 0) ? 'Poné el precio' : undefined;
  const unidad = producto?.unidadMedida?.codigo;
  const unidadCorta = !!unidad && unidad.length <= 4;

  return (
    <li className="relative rounded-xl border border-line bg-paper p-4">
      <div className="flex flex-col gap-3 nav:flex-row nav:items-start nav:gap-3.5">
        <span
          className="inline-flex h-[26px] w-[26px] flex-shrink-0 items-center justify-center rounded-full bg-canvas text-[12.5px] font-bold text-muted nav:mt-[34px]"
          aria-hidden
        >
          {orden}
        </span>

        <div className="pr-12 nav:flex-[2.4] nav:pr-0">
          <Field label="Producto" htmlFor={`${id}-producto`} error={errProducto}>
            <SearchCombo<Producto>
              id={`${id}-producto`}
              inputRef={inputRef}
              items={productos}
              selected={producto}
              getKey={(p) => p.id}
              getLabel={(p) => p.nombre}
              matches={(p, q) => normalizar(p.nombre).includes(q) || normalizar(p.sku ?? '').includes(q)}
              onSelect={onProducto}
              onBlur={onTocar}
              error={!!errProducto}
              placeholder="Buscá por nombre o SKU…"
              emptyText="No hay productos con ese nombre o SKU."
              renderOption={(p) => (
                <div className="flex items-baseline justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-[14.5px] font-semibold text-ink">{p.nombre}</p>
                    <p className="truncate text-[12.5px] text-muted">
                      {p.sku ? `SKU ${p.sku}` : 'Sin SKU'}
                      {p.unidadMedida ? ` · ${p.unidadMedida.codigo}` : ''}
                    </p>
                  </div>
                  <span className="flex-shrink-0 text-[13px] text-ink-soft tabular">
                    {formatMontoExacto(p.precioUnitario)}
                  </span>
                </div>
              )}
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3 nav:contents">
          <div className="nav:flex-[0.8]">
            <Field label="Cantidad" htmlFor={`${id}-cantidad`} error={errCantidad}>
              <div className="relative">
                <Input
                  id={`${id}-cantidad`}
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="any"
                  value={linea.cantidad}
                  error={!!errCantidad}
                  onChange={(e) => onCambio({ cantidad: e.target.value })}
                  onBlur={onTocar}
                  className={`${SIN_FLECHAS} ${unidadCorta ? 'pr-12' : ''}`}
                />
                {unidadCorta && (
                  <span className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 text-[13px] text-muted">
                    {unidad}
                  </span>
                )}
              </div>
              {/* Una unidad larga ("cajon 1.5") no entra adentro del campo. */}
              {unidad && !unidadCorta && <p className="truncate text-[12px] text-muted">en {unidad}</p>}
            </Field>
          </div>
          <div className="nav:flex-1">
            <Field label="Precio unitario" htmlFor={`${id}-precio`} error={errPrecio}>
              <div className="relative">
                <span className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-[15px] text-muted">
                  $
                </span>
                <Input
                  id={`${id}-precio`}
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="any"
                  value={linea.precio}
                  error={!!errPrecio}
                  onChange={(e) => onCambio({ precio: e.target.value })}
                  onBlur={onTocar}
                  className={`${SIN_FLECHAS} pl-8`}
                />
              </div>
            </Field>
          </div>
        </div>

        <div className="flex items-baseline justify-between nav:block nav:flex-1 nav:text-right">
          <p className="text-[13px] font-semibold text-ink-soft nav:mb-[7px]">Subtotal</p>
          <p className="font-serif text-[21px] leading-[44px] font-semibold text-ink tabular">
            {formatMontoExacto(subtotal(linea))}
          </p>
        </div>

        <button
          type="button"
          onClick={onQuitar}
          aria-label={`Quitar línea ${orden}`}
          className="absolute top-4 right-4 inline-flex h-10 w-10 items-center justify-center rounded-[10px] border border-input-border bg-white text-ink-soft transition-colors duration-[120ms] ease-out hover:border-neg-input-border hover:text-neg nav:static nav:mt-[29px] nav:flex-shrink-0"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      </div>
    </li>
  );
}

function ImpactoCuenta({
  tipo,
  entidad,
  total,
  saldoActual,
  saldoNuevo,
}: {
  tipo: Tipo;
  entidad: Entidad | null;
  total: number;
  saldoActual: number;
  saldoNuevo: number;
}) {
  return (
    <div className="rounded-xl border border-verde-soft-border bg-verde-soft p-5">
      <p className="text-[14.5px] font-semibold text-verde-on-soft">Cuando toques “Emitir”</p>
      <p className="mt-1.5 text-[13.5px] leading-[1.55] text-verde-on-soft">
        El remito queda cerrado: ya no se puede editar, solo anular.{' '}
        {entidad ? (
          tipo === 'S' ? (
            <>
              Se le carga {formatMontoExacto(total)} a la cuenta de <strong>{entidad.nombre}</strong> como deuda a
              cobrar.
            </>
          ) : (
            <>
              Se suma {formatMontoExacto(total)} a lo que le debés a <strong>{entidad.nombre}</strong>.
            </>
          )
        ) : (
          <>Elegí a quién va el remito para ver cómo queda su cuenta.</>
        )}
      </p>
      {entidad && (
        <div className="mt-3">
          <TransicionSaldo saldoActual={saldoActual} saldoNuevo={saldoNuevo} />
        </div>
      )}
    </div>
  );
}

function TransicionSaldo({ saldoActual, saldoNuevo }: { saldoActual: number; saldoNuevo: number }) {
  const antes = formatSaldo(saldoActual);
  const despues = formatSaldo(saldoNuevo);
  const color = (c: 'verde' | 'neg' | 'muted') =>
    c === 'verde' ? 'text-verde' : c === 'neg' ? 'text-neg' : 'text-muted';
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-line bg-white px-4 py-3">
      <div>
        <p className="text-[11.5px] font-bold tracking-[0.1em] text-muted uppercase">Hoy</p>
        <p className={`font-serif text-[17px] font-semibold tabular ${color(antes.color)}`}>{antes.texto}</p>
        <p className="text-[12px] text-muted">{antes.leyenda}</p>
      </div>
      <ChevronRight className="h-4 w-4 flex-shrink-0 text-muted" aria-label="pasa a" />
      <div className="text-right">
        <p className="text-[11.5px] font-bold tracking-[0.1em] text-muted uppercase">Después</p>
        <p className={`font-serif text-[17px] font-semibold tabular ${color(despues.color)}`}>{despues.texto}</p>
        <p className="text-[12px] text-muted">{despues.leyenda}</p>
      </div>
    </div>
  );
}

function EditorSkeleton() {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-3.5 w-32" />
        <Skeleton className="h-6 w-56" />
      </div>
      <div className="xl:grid xl:grid-cols-[minmax(0,1fr)_340px] xl:gap-6">
        <div className="flex flex-col gap-4">
          <Skeleton className="h-28 w-full rounded-xl !bg-[#F5F0E7]" />
          <Skeleton className="h-24 w-full rounded-xl !bg-[#F5F0E7]" />
          <Skeleton className="h-24 w-full rounded-xl !bg-[#F5F0E7]" />
        </div>
        <Skeleton className="mt-5 h-48 w-full rounded-xl !bg-[#F5F0E7] xl:mt-0" />
      </div>
    </div>
  );
}
