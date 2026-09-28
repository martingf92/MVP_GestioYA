'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import {
  Search,
  X,
  ChevronRight,
  Users,
  ArrowDown,
  ArrowUp,
  Download,
  Plus,
} from 'lucide-react';
import { Shell } from '@/components/Shell';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Field } from '@/components/ui/Field';
import { Chip } from '@/components/ui/Chip';
import { Avatar } from '@/components/ui/Avatar';
import { RoleBadgeRow } from '@/components/ui/RoleBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { EntidadRowSkeleton } from '@/components/ui/Skeleton';
import { Modal } from '@/components/ui/Modal';
import { Checkbox } from '@/components/ui/Checkbox';
import { AlertBanner } from '@/components/ui/AlertBanner';
import { listEntidades, createEntidad, ApiError, Entidad, getUsuario, clearSession } from '@/lib/api';
import { formatSaldo, formatFechaRelativa } from '@/lib/format';

const TAKE = 20;
type Tipo = 'cliente' | 'proveedor' | 'acreedor';

export default function EntidadesPage() {
  return (
    <Shell>
      <Suspense fallback={<p className="text-sm text-muted">Cargando…</p>}>
        <EntidadesPageContent />
      </Suspense>
    </Shell>
  );
}

function EntidadesPageContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const q = searchParams.get('q') ?? '';
  const tipo = (searchParams.get('tipo') as Tipo | null) ?? undefined;
  const orderDir = (searchParams.get('orderDir') as 'asc' | 'desc' | null) ?? 'desc';
  const page = Math.max(1, Number(searchParams.get('page') ?? '1'));

  const [searchInput, setSearchInput] = useState(q);
  const [status, setStatus] = useState<'loading' | 'error' | 'ready'>('loading');
  const [result, setResult] = useState<{ data: Entidad[]; total: number }>({ data: [], total: 0 });
  const [counts, setCounts] = useState<{
    todas: number;
    activas: number;
    bajas: number;
    cliente: number;
    proveedor: number;
    acreedor: number;
  } | null>(null);
  // ?nueva=1 abre el modal de alta directo (links "Nueva entidad" / "Nuevo
  // cliente" del Inicio).
  const [modalAbierto, setModalAbierto] = useState(searchParams.get('nueva') === '1');

  useEffect(() => {
    if (!getUsuario()) router.push('/login');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function setParam(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === null || value === '') params.delete(key);
    else params.set(key, value);
    if (key !== 'page') params.delete('page');
    router.replace(`${pathname}?${params.toString()}`);
  }

  // Debounce del buscador -> query param `q` (fuente de verdad de los
  // filtros, para que sobrevivan al refresh -- pedido explícito del handoff
  // de diseño).
  useEffect(() => {
    const t = setTimeout(() => {
      if (searchInput !== q) setParam('q', searchInput || null);
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  const fetchList = useCallback(async () => {
    setStatus('loading');
    try {
      const res = await listEntidades({
        nombre: q || undefined,
        tipo,
        orderBy: 'saldo',
        orderDir,
        skip: (page - 1) * TAKE,
        take: TAKE,
      });
      setResult(res);
      setStatus('ready');
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        clearSession();
        router.push('/login');
        return;
      }
      setStatus('error');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, tipo, orderDir, page]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const fetchCounts = useCallback(async () => {
    try {
      const [todas, activas, cliente, proveedor, acreedor] = await Promise.all([
        listEntidades({ take: 1 }),
        listEntidades({ take: 1, activo: true }),
        listEntidades({ take: 1, tipo: 'cliente' }),
        listEntidades({ take: 1, tipo: 'proveedor' }),
        listEntidades({ take: 1, tipo: 'acreedor' }),
      ]);
      setCounts({
        todas: todas.total,
        activas: activas.total,
        bajas: todas.total - activas.total,
        cliente: cliente.total,
        proveedor: proveedor.total,
        acreedor: acreedor.total,
      });
    } catch {
      // Los contadores son informativos -- si fallan no bloquean el listado.
    }
  }, []);

  useEffect(() => {
    fetchCounts();
  }, [fetchCounts]);

  function cerrarModal() {
    setModalAbierto(false);
    if (searchParams.get('nueva')) setParam('nueva', null);
  }

  function handleCreated() {
    cerrarModal();
    fetchList();
    fetchCounts();
  }

  function limpiarFiltros() {
    setSearchInput('');
    router.replace(pathname);
  }

  const hayFiltrosActivos = !!q || !!tipo;

  return (
    <div>
      <div className="mb-5 flex flex-col gap-4 nav:flex-row nav:items-end nav:justify-between">
        <div>
          <h1 className="font-serif text-[26px] font-semibold text-ink nav:text-[28px]">
            Entidades
          </h1>
          <p className="mt-1 text-[13.5px] text-muted">
            {counts
              ? `${counts.activas} activas · ${counts.bajas} dadas de baja`
              : 'Cargando…'}
          </p>
        </div>
        <div className="flex gap-2.5">
          <Button variant="secondary" className="gap-1.5">
            <Download className="h-4 w-4" aria-hidden />
            Exportar
          </Button>
          <Button onClick={() => setModalAbierto(true)} className="gap-1.5">
            <Plus className="h-4 w-4" aria-hidden />
            Nueva entidad
          </Button>
        </div>
      </div>

      <div className="mb-4 flex flex-col gap-3 nav:flex-row nav:items-center nav:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex h-9 w-full items-center gap-2 rounded-full border border-input-border bg-white px-3.5 nav:w-[260px]">
            <Search className="h-4 w-4 flex-shrink-0 text-placeholder" aria-hidden />
            <input
              type="search"
              placeholder="Buscar por nombre…"
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
          <Chip active={!tipo} onClick={() => setParam('tipo', null)}>
            Todas {counts ? counts.todas : ''}
          </Chip>
          <Chip active={tipo === 'cliente'} onClick={() => setParam('tipo', 'cliente')}>
            Clientes {counts ? counts.cliente : ''}
          </Chip>
          <Chip active={tipo === 'proveedor'} onClick={() => setParam('tipo', 'proveedor')}>
            Proveedores {counts ? counts.proveedor : ''}
          </Chip>
          <Chip active={tipo === 'acreedor'} onClick={() => setParam('tipo', 'acreedor')}>
            Acreedores {counts ? counts.acreedor : ''}
          </Chip>
        </div>
        <button
          type="button"
          onClick={() => setParam('orderDir', orderDir === 'desc' ? 'asc' : 'desc')}
          className="flex items-center gap-1 self-start text-[13px] font-medium text-ink-soft nav:self-auto"
        >
          Ordenado por <strong className="text-ink">saldo</strong>
          {orderDir === 'desc' ? (
            <ArrowDown className="h-3.5 w-3.5" aria-hidden />
          ) : (
            <ArrowUp className="h-3.5 w-3.5" aria-hidden />
          )}
        </button>
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
            title="No hay resultados"
            description="Probá con otra búsqueda o sacá los filtros."
            action={
              <Button variant="secondary" onClick={limpiarFiltros}>
                Sacar filtros
              </Button>
            }
          />
        ) : (
          <EmptyState
            icon={Users}
            title="Todavía no hay entidades cargadas"
            description="Cargá la primera y en dos minutos podés emitirle un remito."
            action={<Button onClick={() => setModalAbierto(true)}>Cargar la primera entidad</Button>}
          />
        )
      )}

      {status === 'ready' && result.data.length > 0 && (
        <>
          <div className="flex flex-col gap-2.5 nav:hidden">
            {result.data.map((e) => (
              <EntidadCardMobile key={e.id} entidad={e} />
            ))}
          </div>

          <div className="hidden overflow-x-auto overflow-hidden rounded-xl border border-line bg-paper nav:block">
            <EntidadesTable data={result.data} />
          </div>

          <div className="mt-3 flex items-center justify-between rounded-xl border border-line bg-paper-hover px-4 py-3 text-[13px] text-muted nav:mt-0 nav:rounded-t-none nav:border-t-0">
            <span>
              Mostrando {result.data.length} de {result.total}
            </span>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                disabled={page <= 1}
                onClick={() => setParam('page', String(page - 1))}
              >
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

      {modalAbierto && (
        <NuevaEntidadModal onClose={cerrarModal} onCreated={handleCreated} />
      )}
    </div>
  );
}

function EntidadCardMobile({ entidad }: { entidad: Entidad }) {
  const saldo = formatSaldo(entidad.cuentaCorriente?.saldoActual ?? 0);
  const borderColor =
    saldo.color === 'verde' ? 'border-l-verde' : saldo.color === 'neg' ? 'border-l-neg' : 'border-l-line';
  const colorTexto =
    saldo.color === 'verde' ? 'text-verde' : saldo.color === 'neg' ? 'text-neg' : 'text-muted';

  return (
    <Link
      href={`/cuentas/corrientes/${entidad.id}`}
      className={`flex items-center gap-3 rounded-xl border border-l-4 border-line bg-paper p-4 no-underline ${borderColor} ${!entidad.activo ? 'opacity-55' : ''}`}
    >
      <Avatar nombre={entidad.nombre} tono={entidad.proveedor ? 'terra' : 'verde'} />
      <div className="min-w-0 flex-1">
        <p className={`truncate text-[15px] font-semibold text-ink ${!entidad.activo ? 'line-through' : ''}`}>
          {entidad.nombre}
        </p>
        <p className="truncate text-[12.5px] text-muted">
          {entidad.documentoNro
            ? `${entidad.documentoTipo ?? 'Doc.'} ${entidad.documentoNro}`
            : 'Sin documento'}
          {!entidad.activo && ' · Dada de baja'}
        </p>
        <div className="mt-1.5">
          <RoleBadgeRow
            cliente={!!entidad.cliente}
            proveedor={!!entidad.proveedor}
            acreedor={!!entidad.acreedor}
            activo={entidad.activo}
          />
        </div>
      </div>
      <div className="flex-shrink-0 text-right">
        <p className={`font-serif text-[16px] font-semibold tabular ${colorTexto}`}>{saldo.texto}</p>
        <p className="text-[11.5px] text-muted">{saldo.leyenda}</p>
      </div>
    </Link>
  );
}

function EntidadesTable({ data }: { data: Entidad[] }) {
  return (
    <table className="w-full min-w-[720px] border-collapse text-left">
      <caption className="sr-only">Listado de entidades, ordenado por saldo</caption>
      <thead>
        <tr className="border-b border-line">
          <th scope="col" className="w-[36%] px-5 py-3 text-[12px] font-bold tracking-[0.1em] text-muted uppercase">
            Entidad
          </th>
          <th scope="col" className="w-[22%] px-5 py-3 text-[12px] font-bold tracking-[0.1em] text-muted uppercase">
            Roles
          </th>
          <th scope="col" className="w-[20%] px-5 py-3 text-[12px] font-bold tracking-[0.1em] text-muted uppercase">
            Saldo
          </th>
          <th scope="col" className="w-[16%] px-5 py-3 text-[12px] font-bold tracking-[0.1em] text-muted uppercase">
            Último movimiento
          </th>
          <th scope="col" className="w-[52px] px-5 py-3" />
        </tr>
      </thead>
      <tbody>
        {data.map((e) => {
          const saldo = formatSaldo(e.cuentaCorriente?.saldoActual ?? 0);
          const colorTexto =
            saldo.color === 'verde' ? 'text-verde' : saldo.color === 'neg' ? 'text-neg' : 'text-muted';
          const ultimoMov = e.cuentaCorriente?.movimientos[0]?.fecha ?? null;

          return (
            <tr
              key={e.id}
              className={`border-b border-line-soft last:border-0 hover:bg-paper-hover ${!e.activo ? 'opacity-55' : ''}`}
            >
              <td className="px-5 py-[14px]">
                <div className="flex items-center gap-3">
                  <Avatar nombre={e.nombre} tono={e.proveedor ? 'terra' : 'verde'} />
                  <div className="min-w-0">
                    <p className={`truncate text-[15px] font-semibold text-ink ${!e.activo ? 'line-through' : ''}`}>
                      {e.nombre}
                    </p>
                    <p className="truncate text-[12.5px] text-muted">
                      {e.documentoNro ? `${e.documentoTipo ?? 'Doc.'} ${e.documentoNro}` : 'Sin documento'}
                      {!e.activo && ' · Dada de baja'}
                    </p>
                  </div>
                </div>
              </td>
              <td className="px-5 py-[14px]">
                <RoleBadgeRow
                  cliente={!!e.cliente}
                  proveedor={!!e.proveedor}
                  acreedor={!!e.acreedor}
                  activo={e.activo}
                />
              </td>
              <td className="px-5 py-[14px]">
                <p className={`font-serif text-[18px] font-semibold tabular ${colorTexto}`}>{saldo.texto}</p>
                <p className="text-[12px] text-muted">{saldo.leyenda}</p>
              </td>
              <td className="px-5 py-[14px] text-[13.5px] text-ink-soft">
                {formatFechaRelativa(ultimoMov)}
              </td>
              <td className="px-5 py-[14px] text-right">
                <Link href={`/cuentas/corrientes/${e.id}`} aria-label={`Ver ${e.nombre}`}>
                  <ChevronRight className="h-4 w-4 text-muted" aria-hidden />
                </Link>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function NuevaEntidadModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [nombre, setNombre] = useState('');
  const [documentoNro, setDocumentoNro] = useState('');
  const [esCliente, setEsCliente] = useState(false);
  const [esProveedor, setEsProveedor] = useState(false);
  const [esAcreedor, setEsAcreedor] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await createEntidad({
        nombre,
        documentoNro: documentoNro || undefined,
        esCliente,
        esProveedor,
        esAcreedor,
      });
      onCreated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error de conexión');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title="Nueva entidad" onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Field label="Nombre" htmlFor="nueva-nombre">
          <Input
            id="nueva-nombre"
            required
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
          />
        </Field>
        <Field label="CUIT / documento (opcional)" htmlFor="nueva-doc">
          <Input id="nueva-doc" value={documentoNro} onChange={(e) => setDocumentoNro(e.target.value)} />
        </Field>
        <div className="flex flex-col gap-2.5">
          <p className="text-[13px] font-semibold text-ink-soft">Roles (podés marcar más de uno)</p>
          <Checkbox id="nueva-cliente" checked={esCliente} onChange={setEsCliente} label="Cliente" />
          <Checkbox id="nueva-proveedor" checked={esProveedor} onChange={setEsProveedor} label="Proveedor" />
          <Checkbox id="nueva-acreedor" checked={esAcreedor} onChange={setEsAcreedor} label="Acreedor" />
        </div>
        {error && <AlertBanner variant="error">{error}</AlertBanner>}
        <div className="mt-1 flex justify-end gap-2.5">
          <Button type="button" variant="ghost" onClick={onClose}>
            Descartar
          </Button>
          <Button type="submit" disabled={busy}>
            {busy ? 'Creando…' : 'Crear entidad'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
