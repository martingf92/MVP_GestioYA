'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Package, Pencil, Plus, Search, TriangleAlert, X } from 'lucide-react';
import { Shell } from '@/components/Shell';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { Field } from '@/components/ui/Field';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { AlertBanner } from '@/components/ui/AlertBanner';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { EntidadRowSkeleton } from '@/components/ui/Skeleton';
import {
  ApiError,
  Producto,
  UnidadMedida,
  clearSession,
  createProducto,
  deleteProducto,
  getUsuario,
  listProductos,
  listUnidadesMedida,
  updateProducto,
} from '@/lib/api';
import { formatMontoExacto } from '@/lib/format';

const TAKE = 20;
type Filtro = 'activos' | 'bajas' | 'todos';

export default function ProductosPage() {
  return (
    <Shell>
      <Suspense fallback={<p className="text-sm text-muted">Cargando…</p>}>
        <ProductosPageContent />
      </Suspense>
    </Shell>
  );
}

function ProductosPageContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const q = searchParams.get('q') ?? '';
  const filtroParam = searchParams.get('estado');
  const filtro: Filtro = filtroParam === 'bajas' || filtroParam === 'todos' ? filtroParam : 'activos';
  const page = Math.max(1, Number(searchParams.get('page') ?? '1'));

  const [searchInput, setSearchInput] = useState(q);
  const [status, setStatus] = useState<'loading' | 'error' | 'ready'>('loading');
  const [result, setResult] = useState<{ data: Producto[]; total: number }>({ data: [], total: 0 });
  const [counts, setCounts] = useState<Record<Filtro, number> | null>(null);
  const [unidades, setUnidades] = useState<UnidadMedida[] | null>(null);
  // null = cerrado; 'nuevo' = alta; un Producto = edición.
  // ?nuevo=1 abre el alta directo.
  const [modal, setModal] = useState<'nuevo' | Producto | null>(
    searchParams.get('nuevo') === '1' ? 'nuevo' : null,
  );

  useEffect(() => {
    if (!getUsuario()) router.push('/login');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function setParam(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === null || value === '') params.delete(key);
    else params.set(key, value);
    if (key !== 'page') params.delete('page');
    const s = params.toString();
    router.replace(s ? `${pathname}?${s}` : pathname);
  }

  // Debounce del buscador -> query param `q` (filtros en la URL, igual que
  // en Entidades y Remitos).
  useEffect(() => {
    const t = setTimeout(() => {
      if (searchInput !== q) setParam('q', searchInput || null);
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  const manejarError = useCallback(
    (err: unknown) => {
      if (err instanceof ApiError && err.status === 401) {
        clearSession();
        router.push('/login');
        return true;
      }
      return false;
    },
    [router],
  );

  const fetchList = useCallback(async () => {
    setStatus('loading');
    try {
      const res = await listProductos({
        q: q || undefined,
        activo: filtro === 'todos' ? undefined : filtro === 'activos',
        skip: (page - 1) * TAKE,
        take: TAKE,
      });
      setResult(res);
      setStatus('ready');
    } catch (err) {
      if (!manejarError(err)) setStatus('error');
    }
  }, [q, filtro, page, manejarError]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const fetchCounts = useCallback(async () => {
    try {
      const [todos, activos] = await Promise.all([
        listProductos({ take: 1 }),
        listProductos({ take: 1, activo: true }),
      ]);
      setCounts({ todos: todos.total, activos: activos.total, bajas: todos.total - activos.total });
    } catch {
      // Informativos: si fallan no bloquean el listado.
    }
  }, []);

  useEffect(() => {
    fetchCounts();
  }, [fetchCounts]);

  // Las unidades hacen falta para el alta/edición y para avisar si no hay.
  useEffect(() => {
    listUnidadesMedida()
      .then(setUnidades)
      .catch(() => setUnidades([]));
  }, []);

  function cerrarModal() {
    setModal(null);
    if (searchParams.get('nuevo')) setParam('nuevo', null);
  }

  function handleGuardado() {
    cerrarModal();
    fetchList();
    fetchCounts();
  }

  function limpiarFiltros() {
    setSearchInput('');
    router.replace(pathname);
  }

  const hayFiltrosActivos = !!q || filtro !== 'activos';
  const sinUnidades = unidades !== null && unidades.length === 0;

  return (
    <div>
      <div className="mb-5 flex flex-col gap-4 nav:flex-row nav:items-end nav:justify-between">
        <div>
          <h1 className="font-serif text-[26px] font-semibold text-ink nav:text-[28px]">Productos</h1>
          <p className="mt-1 text-[13.5px] text-muted">
            {counts
              ? `${counts.activos} ${counts.activos === 1 ? 'activo' : 'activos'} · ${counts.bajas} ${counts.bajas === 1 ? 'dado de baja' : 'dados de baja'}`
              : 'Cargando…'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <Link href="/unidades-medida" className="text-[14px] font-semibold text-ink-soft">
            Unidades de medida
          </Link>
          <Button onClick={() => setModal('nuevo')} disabled={sinUnidades} className="gap-1.5">
            <Plus className="h-4 w-4" aria-hidden />
            Nuevo producto
          </Button>
        </div>
      </div>

      {sinUnidades && (
        <AlertBanner variant="warn" className="mb-4" title="Primero cargá una unidad de medida">
          Cada producto necesita una unidad (kilo, unidad, caja…).{' '}
          <Link href="/unidades-medida">Cargá la primera en Unidades de medida</Link> y volvé.
        </AlertBanner>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex h-9 w-full items-center gap-2 rounded-full border border-input-border bg-white px-3.5 nav:w-[260px]">
          <Search className="h-4 w-4 flex-shrink-0 text-placeholder" aria-hidden />
          <input
            type="search"
            placeholder="Buscar por nombre o SKU…"
            aria-label="Buscar productos por nombre o SKU"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full bg-transparent text-[13.5px] text-ink placeholder:text-placeholder focus-visible:outline-none"
          />
          {searchInput && (
            <button type="button" onClick={() => setSearchInput('')} aria-label="Limpiar búsqueda">
              <X className="h-3.5 w-3.5 text-muted" aria-hidden />
            </button>
          )}
        </div>
        <Chip active={filtro === 'activos'} onClick={() => setParam('estado', null)}>
          Activos {counts ? counts.activos : ''}
        </Chip>
        <Chip active={filtro === 'bajas'} onClick={() => setParam('estado', 'bajas')}>
          Dados de baja {counts ? counts.bajas : ''}
        </Chip>
        <Chip active={filtro === 'todos'} onClick={() => setParam('estado', 'todos')}>
          Todos {counts ? counts.todos : ''}
        </Chip>
      </div>

      {status === 'error' && <ErrorState onRetry={fetchList} />}

      {status === 'loading' && (
        <>
          <div className="flex flex-col gap-2.5 nav:hidden">
            {Array.from({ length: 5 }).map((_, i) => (
              <EntidadRowSkeleton key={i} variant="card" />
            ))}
          </div>
          <div className="hidden overflow-hidden rounded-xl border border-line bg-paper nav:block">
            {Array.from({ length: 6 }).map((_, i) => (
              <EntidadRowSkeleton key={i} variant="table" />
            ))}
          </div>
        </>
      )}

      {status === 'ready' && result.data.length === 0 && (
        hayFiltrosActivos ? (
          <EmptyState
            icon={Search}
            title="No hay productos con esos filtros"
            description="Probá con otra búsqueda o sacá los filtros."
            action={
              <Button variant="secondary" onClick={limpiarFiltros}>
                Sacar filtros
              </Button>
            }
          />
        ) : (
          <EmptyState
            icon={Package}
            title="Todavía no cargaste productos"
            description="Cargá lo que vendés o comprás, con su precio y su costo, y después lo elegís al armar un remito."
            action={
              <Button onClick={() => setModal('nuevo')} disabled={sinUnidades}>
                Cargar el primer producto
              </Button>
            }
          />
        )
      )}

      {status === 'ready' && result.data.length > 0 && (
        <>
          <div className="flex flex-col gap-2.5 nav:hidden">
            {result.data.map((p) => (
              <ProductoCardMobile key={p.id} producto={p} onEditar={() => setModal(p)} />
            ))}
          </div>

          <div className="hidden overflow-x-auto overflow-hidden rounded-xl border border-line bg-paper nav:block">
            <ProductosTable data={result.data} onEditar={setModal} />
          </div>

          <div className="mt-3 flex items-center justify-between rounded-xl border border-line bg-paper-hover px-4 py-3 text-[13px] text-muted nav:mt-0 nav:rounded-t-none nav:border-t-0">
            <span>
              Mostrando {result.data.length} de {result.total}
            </span>
            <div className="flex gap-2">
              <Button variant="secondary" disabled={page <= 1} onClick={() => setParam('page', String(page - 1))}>
                Anterior
              </Button>
              <Button
                variant="secondary"
                disabled={page * TAKE >= result.total}
                onClick={() => setParam('page', String(page + 1))}
              >
                Siguiente
              </Button>
            </div>
          </div>
        </>
      )}

      {modal && (
        <ProductoModal
          producto={modal === 'nuevo' ? null : modal}
          unidades={unidades ?? []}
          onClose={cerrarModal}
          onGuardado={handleGuardado}
        />
      )}
    </div>
  );
}

/**
 * Margen sobre el precio de venta: (precio − costo) / precio. Sin costo o
 * sin precio cargado no se calcula (daría 100% o no tendría sentido).
 */
function calcularMargen(precio: number, costo: number) {
  if (!(precio > 0) || !(costo > 0)) return null;
  const pct = Math.round(((precio - costo) / precio) * 100);
  return { pct, texto: `${pct}%`, bajoCosto: precio < costo };
}

function MargenTexto({ precio, costo }: { precio: number; costo: number }) {
  const m = calcularMargen(precio, costo);
  if (!m) return <span className="text-muted">—</span>;
  if (m.bajoCosto) {
    return (
      <span className="inline-flex items-center gap-1 font-semibold text-neg">
        <TriangleAlert className="h-3.5 w-3.5" aria-hidden />
        {m.texto} · bajo costo
      </span>
    );
  }
  return <span className="text-ink">{m.texto}</span>;
}

function ProductoCardMobile({ producto: p, onEditar }: { producto: Producto; onEditar: () => void }) {
  const precio = Number(p.precioUnitario);
  const costo = Number(p.costo);
  return (
    <button
      type="button"
      onClick={onEditar}
      className={`flex w-full items-center gap-3 rounded-xl border border-line bg-paper p-4 text-left hover:bg-paper-hover ${!p.activo ? 'opacity-55' : ''}`}
    >
      <span
        className="inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-canvas text-ink-soft"
        aria-hidden
      >
        <Package className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className={`truncate text-[15px] font-semibold text-ink ${!p.activo ? 'line-through' : ''}`}>
          {p.nombre}
        </p>
        <p className="truncate text-[12.5px] text-muted">
          {p.sku ? `SKU ${p.sku}` : 'Sin SKU'} · {p.unidadMedida?.codigo ?? '—'}
          {!p.activo && ' · Dado de baja'}
        </p>
      </div>
      <div className="flex-shrink-0 text-right">
        <p className="font-serif text-[16px] font-semibold text-ink tabular">{formatMontoExacto(precio)}</p>
        <p className="text-[11.5px] text-muted">
          margen <MargenTexto precio={precio} costo={costo} />
        </p>
      </div>
    </button>
  );
}

const TH = 'px-5 py-3 text-[12px] font-bold tracking-[0.1em] text-muted uppercase';

function ProductosTable({ data, onEditar }: { data: Producto[]; onEditar: (p: Producto) => void }) {
  return (
    <table className="w-full min-w-[760px] border-collapse text-left">
      <caption className="sr-only">Listado de productos, por nombre</caption>
      <thead>
        <tr className="border-b border-line">
          <th scope="col" className={`w-[36%] ${TH}`}>Producto</th>
          <th scope="col" className={`w-[12%] ${TH}`}>Unidad</th>
          <th scope="col" className={`w-[16%] text-right ${TH}`}>Precio de venta</th>
          <th scope="col" className={`w-[14%] text-right ${TH}`}>Costo</th>
          <th scope="col" className={`w-[14%] text-right ${TH}`}>Margen</th>
          <th scope="col" className="w-[60px] px-5 py-3">
            <span className="sr-only">Editar</span>
          </th>
        </tr>
      </thead>
      <tbody>
        {data.map((p) => {
          const precio = Number(p.precioUnitario);
          const costo = Number(p.costo);
          return (
            <tr
              key={p.id}
              className={`border-b border-line-soft last:border-0 hover:bg-paper-hover ${!p.activo ? 'opacity-55' : ''}`}
            >
              <td className="px-5 py-[14px]">
                <p className={`text-[15px] font-semibold text-ink ${!p.activo ? 'line-through' : ''}`}>{p.nombre}</p>
                <p className="text-[12.5px] text-muted">
                  {p.sku ? `SKU ${p.sku}` : 'Sin SKU'}
                  {!p.activo && ' · Dado de baja'}
                </p>
              </td>
              <td className="px-5 py-[14px] text-[14px] text-ink-soft">{p.unidadMedida?.codigo ?? '—'}</td>
              <td className="px-5 py-[14px] text-right font-serif text-[17px] font-semibold text-ink tabular">
                {formatMontoExacto(precio)}
              </td>
              <td className="px-5 py-[14px] text-right text-[14.5px] text-ink-soft tabular">
                {costo > 0 ? formatMontoExacto(costo) : <span className="text-muted">Sin cargar</span>}
              </td>
              <td className="px-5 py-[14px] text-right text-[14.5px] tabular">
                <MargenTexto precio={precio} costo={costo} />
              </td>
              <td className="px-5 py-[14px] text-right">
                <button
                  type="button"
                  onClick={() => onEditar(p)}
                  aria-label={`Editar ${p.nombre}`}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-[10px] text-ink-soft hover:bg-canvas"
                >
                  <Pencil className="h-4 w-4" aria-hidden />
                </button>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

/** Acepta coma decimal. NaN si está vacío. */
function num(s: string): number {
  return s.trim() === '' ? NaN : Number(s.replace(',', '.'));
}

function ProductoModal({
  producto,
  unidades,
  onClose,
  onGuardado,
}: {
  producto: Producto | null;
  unidades: UnidadMedida[];
  onClose: () => void;
  onGuardado: () => void;
}) {
  const edicion = !!producto;
  const [nombre, setNombre] = useState(producto?.nombre ?? '');
  const [sku, setSku] = useState(producto?.sku ?? '');
  const [unidadMedidaId, setUnidadMedidaId] = useState(producto?.unidadMedidaId ?? '');
  const [precio, setPrecio] = useState(producto ? String(Number(producto.precioUnitario)) : '');
  const [costo, setCosto] = useState(producto && Number(producto.costo) > 0 ? String(Number(producto.costo)) : '');
  const [intento, setIntento] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const errNombre = intento && !nombre.trim() ? 'Poné el nombre del producto' : undefined;
  const errUnidad = intento && !unidadMedidaId ? 'Elegí la unidad de medida' : undefined;
  const errPrecio = precio !== '' && !(num(precio) >= 0) ? 'Tiene que ser un número' : undefined;
  const errCosto = costo !== '' && !(num(costo) >= 0) ? 'Tiene que ser un número' : undefined;
  const margen = calcularMargen(num(precio), num(costo));
  const unidad = unidades.find((u) => u.id === unidadMedidaId);

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setIntento(true);
    if (!nombre.trim() || !unidadMedidaId || errPrecio || errCosto) return;
    setBusy(true);
    setError(null);
    const datos = {
      nombre: nombre.trim(),
      sku: sku.trim(),
      unidadMedidaId,
      precioUnitario: precio === '' ? 0 : num(precio),
      costo: costo === '' ? 0 : num(costo),
    };
    try {
      if (producto) await updateProducto(producto.id, datos);
      else await createProducto({ ...datos, sku: datos.sku || undefined });
      onGuardado();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Se cortó la conexión.');
      setBusy(false);
    }
  }

  async function cambiarEstado() {
    if (!producto) return;
    setBusy(true);
    setError(null);
    try {
      if (producto.activo) await deleteProducto(producto.id);
      else await updateProducto(producto.id, { activo: true });
      onGuardado();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Se cortó la conexión.');
      setBusy(false);
    }
  }

  return (
    <Modal title={edicion ? 'Editar producto' : 'Nuevo producto'} onClose={onClose}>
      <form onSubmit={guardar} noValidate className="flex flex-col gap-4">
        {producto && !producto.activo && (
          <AlertBanner variant="warn">
            Este producto está dado de baja: no aparece para elegir en los remitos nuevos.
          </AlertBanner>
        )}
        <Field label="Nombre" htmlFor="prod-nombre" error={errNombre}>
          <Input id="prod-nombre" value={nombre} error={!!errNombre} onChange={(e) => setNombre(e.target.value)} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="SKU / código (opcional)" htmlFor="prod-sku">
            <Input id="prod-sku" value={sku} onChange={(e) => setSku(e.target.value)} />
          </Field>
          <Field label="Unidad de medida" htmlFor="prod-unidad" error={errUnidad}>
            <select
              id="prod-unidad"
              value={unidadMedidaId}
              onChange={(e) => setUnidadMedidaId(e.target.value)}
              className={`min-h-11 w-full rounded-[10px] border bg-white px-[15px] py-[12px] text-[15px] text-ink focus-visible:outline-none
                ${errUnidad ? 'border-[1.5px] border-neg-input-border' : 'border-input-border'}
                ${unidadMedidaId === '' ? 'text-placeholder' : ''}`}
            >
              <option value="" disabled>
                Elegí…
              </option>
              {unidades.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.codigo}
                  {u.descripcion ? ` — ${u.descripcion}` : ''}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Precio de venta" htmlFor="prod-precio" error={errPrecio}>
            <PrecioInput id="prod-precio" value={precio} onChange={setPrecio} error={!!errPrecio} />
          </Field>
          <Field label="Costo (opcional)" htmlFor="prod-costo" error={errCosto}>
            <PrecioInput id="prod-costo" value={costo} onChange={setCosto} error={!!errCosto} />
          </Field>
        </div>
        <p className="text-[13px] text-ink-soft" aria-live="polite">
          {margen ? (
            margen.bajoCosto ? (
              <span className="inline-flex items-center gap-1 font-semibold text-neg">
                <TriangleAlert className="h-3.5 w-3.5" aria-hidden />
                Vendés por debajo del costo: perdés {formatMontoExacto(num(costo) - num(precio))}
                {unidad ? ` por ${unidad.codigo}` : ''}.
              </span>
            ) : (
              <>
                Margen <strong className="text-ink">{margen.texto}</strong>: ganás{' '}
                {formatMontoExacto(num(precio) - num(costo))}
                {unidad ? ` por ${unidad.codigo}` : ''}.
              </>
            )
          ) : (
            'Con precio y costo cargados te mostramos el margen. El costo también se usa como precio sugerido en los remitos de entrada.'
          )}
        </p>
        {error && <AlertBanner variant="error">{error}</AlertBanner>}
        <div className="mt-1 flex flex-wrap items-center justify-between gap-2.5">
          {producto ? (
            <Button
              type="button"
              variant={producto.activo ? 'destructive' : 'secondary'}
              onClick={cambiarEstado}
              disabled={busy}
            >
              {producto.activo ? 'Dar de baja' : 'Reactivar'}
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2.5">
            <Button type="button" variant="ghost" onClick={onClose} disabled={busy}>
              Descartar
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? 'Guardando…' : edicion ? 'Guardar cambios' : 'Crear producto'}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}

const SIN_FLECHAS =
  '[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none';

function PrecioInput({
  id,
  value,
  onChange,
  error,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  error: boolean;
}) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-[15px] text-muted">$</span>
      <Input
        id={id}
        type="number"
        inputMode="decimal"
        min="0"
        step="any"
        value={value}
        error={error}
        onChange={(e) => onChange(e.target.value)}
        className={`${SIN_FLECHAS} pl-8`}
      />
    </div>
  );
}
