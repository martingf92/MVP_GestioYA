'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { ArrowDownLeft, ArrowUpRight, ChevronRight, FileText, Plus, Search, X } from 'lucide-react';
import { Shell } from '@/components/Shell';
import { Button, buttonClasses } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { Segmented } from '@/components/ui/Segmented';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { EntidadRowSkeleton } from '@/components/ui/Skeleton';
import { ApiError, RemitoResumen, clearSession, getUsuario, listRemitos } from '@/lib/api';
import { formatFechaPartes, formatMontoExacto, remitoTitulo } from '@/lib/format';

const TAKE = 20;
type Estado = RemitoResumen['estado'];
type TipoFiltro = 'todos' | 'S' | 'E';

export default function RemitosPage() {
  return (
    <Shell>
      <Suspense fallback={<p className="text-sm text-muted">Cargando…</p>}>
        <RemitosPageContent />
      </Suspense>
    </Shell>
  );
}

function RemitosPageContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const q = searchParams.get('q') ?? '';
  const estado = (searchParams.get('estado') as Estado | null) ?? undefined;
  const tipoParam = searchParams.get('tipo');
  const tipo = tipoParam === 'S' || tipoParam === 'E' ? tipoParam : undefined;
  const page = Math.max(1, Number(searchParams.get('page') ?? '1'));

  const [searchInput, setSearchInput] = useState(q);
  const [status, setStatus] = useState<'loading' | 'error' | 'ready'>('loading');
  const [result, setResult] = useState<{ data: RemitoResumen[]; total: number }>({ data: [], total: 0 });
  const [counts, setCounts] = useState<Record<'todos' | Estado, number> | null>(null);

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

  // Debounce del buscador -> query param `q` (los filtros viven en la URL,
  // igual que en Entidades).
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
      const res = await listRemitos({
        q: q || undefined,
        estado,
        tipo,
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
  }, [q, estado, tipo, page]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  // Contadores de los chips: respetan el tipo elegido (Salidas/Entradas)
  // para que el número del chip coincida con lo que se ve al tocarlo.
  const fetchCounts = useCallback(async () => {
    try {
      const [todos, borrador, emitido, anulado] = await Promise.all([
        listRemitos({ take: 1, tipo }),
        listRemitos({ take: 1, tipo, estado: 'borrador' }),
        listRemitos({ take: 1, tipo, estado: 'emitido' }),
        listRemitos({ take: 1, tipo, estado: 'anulado' }),
      ]);
      setCounts({
        todos: todos.total,
        borrador: borrador.total,
        emitido: emitido.total,
        anulado: anulado.total,
      });
    } catch {
      // Informativos: si fallan no bloquean el listado.
    }
  }, [tipo]);

  useEffect(() => {
    fetchCounts();
  }, [fetchCounts]);

  function limpiarFiltros() {
    setSearchInput('');
    router.replace(pathname);
  }

  const hayFiltrosActivos = !!q || !!estado || !!tipo;

  return (
    <div>
      <div className="mb-5 flex flex-col gap-4 nav:flex-row nav:items-end nav:justify-between">
        <div>
          <h1 className="font-serif text-[26px] font-semibold text-ink nav:text-[28px]">Remitos</h1>
          <p className="mt-1 text-[13.5px] text-muted">
            {counts ? resumenCounts(counts) : 'Cargando…'}
          </p>
        </div>
        <Link href="/remitos/nuevo" className={buttonClasses('primary', 'gap-1.5 self-start nav:self-auto')}>
          <Plus className="h-4 w-4" aria-hidden />
          Nuevo remito
        </Link>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex h-9 w-full items-center gap-2 rounded-full border border-input-border bg-white px-3.5 nav:w-[260px]">
          <Search className="h-4 w-4 flex-shrink-0 text-placeholder" aria-hidden />
          <input
            type="search"
            placeholder="Buscar por entidad o número…"
            aria-label="Buscar remitos por entidad o número"
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
        <Chip active={!estado} onClick={() => setParam('estado', null)}>
          Todos {counts ? counts.todos : ''}
        </Chip>
        <Chip active={estado === 'borrador'} onClick={() => setParam('estado', 'borrador')}>
          Borradores {counts ? counts.borrador : ''}
        </Chip>
        <Chip active={estado === 'emitido'} onClick={() => setParam('estado', 'emitido')}>
          Emitidos {counts ? counts.emitido : ''}
        </Chip>
        <Chip active={estado === 'anulado'} onClick={() => setParam('estado', 'anulado')}>
          Anulados {counts ? counts.anulado : ''}
        </Chip>
        <div className="mt-1 w-full nav:mt-0 nav:ml-auto nav:w-[280px]">
          <Segmented<TipoFiltro>
            label="Tipo de remito"
            size="sm"
            value={tipo ?? 'todos'}
            onChange={(v) => setParam('tipo', v === 'todos' ? null : v)}
            options={[
              { value: 'todos', label: 'Todos' },
              { value: 'S', label: 'Salidas' },
              { value: 'E', label: 'Entradas' },
            ]}
          />
        </div>
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
            title="No hay remitos con esos filtros"
            description="Probá con otra búsqueda o sacá los filtros."
            action={
              <Button variant="secondary" onClick={limpiarFiltros}>
                Sacar filtros
              </Button>
            }
          />
        ) : (
          <EmptyState
            icon={FileText}
            title="Todavía no hiciste ningún remito"
            description="Cargá el primero: elegís a quién le entregás, qué productos, y al emitirlo queda asentado en su cuenta corriente."
            action={
              <Link href="/remitos/nuevo" className={buttonClasses('primary')}>
                Hacer el primer remito
              </Link>
            }
          />
        )
      )}

      {status === 'ready' && result.data.length > 0 && (
        <>
          <div className="flex flex-col gap-2.5 nav:hidden">
            {result.data.map((r) => (
              <RemitoCardMobile key={r.id} remito={r} />
            ))}
          </div>

          <div className="hidden overflow-x-auto overflow-hidden rounded-xl border border-line bg-paper nav:block">
            <RemitosTable data={result.data} />
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
    </div>
  );
}

function resumenCounts(c: Record<'todos' | Estado, number>): string {
  if (c.todos === 0) return 'Sin remitos todavía';
  const partes = [`${c.emitido} ${c.emitido === 1 ? 'emitido' : 'emitidos'}`];
  if (c.borrador > 0) {
    partes.push(`${c.borrador} ${c.borrador === 1 ? 'borrador sin emitir' : 'borradores sin emitir'}`);
  }
  if (c.anulado > 0) partes.push(`${c.anulado} ${c.anulado === 1 ? 'anulado' : 'anulados'}`);
  return partes.join(' · ');
}

/** Salida = le entregaste algo a la entidad; Entrada = te lo entregó ella. */
function TipoIcono({ tipo }: { tipo: 'E' | 'S' }) {
  const Icon = tipo === 'S' ? ArrowUpRight : ArrowDownLeft;
  return (
    <span
      className={`inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg
        ${tipo === 'S' ? 'bg-verde-soft text-verde-on-soft' : 'bg-terra-soft text-terra-on-soft'}`}
      aria-hidden
    >
      <Icon className="h-4 w-4" />
    </span>
  );
}

function tipoTexto(tipo: 'E' | 'S') {
  return tipo === 'S' ? 'Salida' : 'Entrada';
}

function lineasTexto(n: number) {
  return `${n} ${n === 1 ? 'línea' : 'líneas'}`;
}

function RemitoCardMobile({ remito: r }: { remito: RemitoResumen }) {
  const anulado = r.estado === 'anulado';
  const fecha = formatFechaPartes(r.fecha);
  return (
    <Link
      href={`/remitos/${r.id}`}
      className={`flex items-center gap-3 rounded-xl border border-line bg-paper p-4 no-underline hover:bg-paper-hover ${anulado ? 'opacity-55' : ''}`}
    >
      <TipoIcono tipo={r.tipo} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-semibold text-ink">{r.entidad?.nombre ?? 'Sin entidad'}</p>
        <p className="truncate text-[12.5px] text-muted">
          {tipoTexto(r.tipo)} · {remitoTitulo(r)} · {fecha.diaMes}
        </p>
        <div className="mt-1.5">
          <StatusBadge estado={r.estado} size="sm" />
        </div>
      </div>
      <div className="flex-shrink-0 text-right">
        <p className={`font-serif text-[16px] font-semibold text-ink tabular ${anulado ? 'line-through' : ''}`}>
          {formatMontoExacto(r.total)}
        </p>
        <p className="text-[11.5px] text-muted">{lineasTexto(r.lineas)}</p>
      </div>
    </Link>
  );
}

const TH = 'px-5 py-3 text-[12px] font-bold tracking-[0.1em] text-muted uppercase';

function RemitosTable({ data }: { data: RemitoResumen[] }) {
  return (
    <table className="w-full min-w-[760px] border-collapse text-left">
      <caption className="sr-only">Listado de remitos, del más nuevo al más viejo</caption>
      <thead>
        <tr className="border-b border-line">
          <th scope="col" className={`w-[24%] ${TH}`}>Remito</th>
          <th scope="col" className={`w-[30%] ${TH}`}>Entidad</th>
          <th scope="col" className={`w-[12%] ${TH}`}>Fecha</th>
          <th scope="col" className={`w-[14%] ${TH}`}>Estado</th>
          <th scope="col" className={`w-[16%] text-right ${TH}`}>Total</th>
          <th scope="col" className="w-[52px] px-5 py-3">
            <span className="sr-only">Abrir</span>
          </th>
        </tr>
      </thead>
      <tbody>
        {data.map((r) => {
          const anulado = r.estado === 'anulado';
          const fecha = formatFechaPartes(r.fecha);
          return (
            <tr
              key={r.id}
              className={`border-b border-line-soft last:border-0 hover:bg-paper-hover ${anulado ? 'opacity-55' : ''}`}
            >
              <td className="px-5 py-[14px]">
                <div className="flex items-center gap-3">
                  <TipoIcono tipo={r.tipo} />
                  <div className="min-w-0">
                    <Link
                      href={`/remitos/${r.id}`}
                      className="block truncate text-[15px] font-semibold text-ink no-underline hover:underline"
                    >
                      {remitoTitulo(r)}
                    </Link>
                    <p className="truncate text-[12.5px] text-muted">
                      {tipoTexto(r.tipo)} · {lineasTexto(r.lineas)}
                    </p>
                  </div>
                </div>
              </td>
              <td className="px-5 py-[14px] text-[14.5px] text-ink">
                {r.entidad?.nombre ?? <span className="text-muted">Sin entidad</span>}
              </td>
              <td className="px-5 py-[14px]">
                <p className="text-[14px] font-semibold text-ink">{fecha.diaMes}</p>
                <p className="text-[12px] text-muted">{fecha.anio}</p>
              </td>
              <td className="px-5 py-[14px]">
                <StatusBadge estado={r.estado} size="sm" />
              </td>
              <td className="px-5 py-[14px] text-right">
                <p className={`font-serif text-[18px] font-semibold text-ink tabular ${anulado ? 'line-through' : ''}`}>
                  {formatMontoExacto(r.total)}
                </p>
              </td>
              <td className="px-5 py-[14px] text-right">
                <Link href={`/remitos/${r.id}`} aria-label={`Ver remito ${remitoTitulo(r)}`}>
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
