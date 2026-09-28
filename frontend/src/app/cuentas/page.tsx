'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { ChevronDown, ChevronRight, Plus, Scale } from 'lucide-react';
import { Shell } from '@/components/Shell';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { Avatar } from '@/components/ui/Avatar';
import { Segmented } from '@/components/ui/Segmented';
import { Skeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { EmptyState } from '@/components/ui/EmptyState';
import { AlertBanner } from '@/components/ui/AlertBanner';
import { RoleBadgeRow } from '@/components/ui/RoleBadge';
import { ObligacionesLista } from '@/components/cuentas/ObligacionesLista';
import { PagosLista } from '@/components/cuentas/PagosLista';
import { NuevaObligacionModal } from '@/components/cuentas/NuevaObligacionModal';
import { RegistrarPagoModal } from '@/components/cuentas/RegistrarPagoModal';
import {
  ApiError,
  DashboardResumen,
  Entidad,
  Obligacion,
  Pago,
  anularObligacion,
  anularPago,
  clearSession,
  getDashboardResumen,
  getUsuario,
  listEntidades,
  listObligaciones,
  listPagos,
} from '@/lib/api';
import { formatMonto, formatSaldo } from '@/lib/format';

type Tab = 'corrientes' | 'obligaciones' | 'pagos';
const PAGINA = 20;

export default function CuentasPage() {
  return (
    <Shell>
      <Suspense fallback={<CuentasSkeleton />}>
        <CuentasContent />
      </Suspense>
    </Shell>
  );
}

function useQueryParams() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const set = useCallback(
    (cambios: Record<string, string | null>) => {
      const p = new URLSearchParams(searchParams.toString());
      for (const [k, v] of Object.entries(cambios)) {
        if (v === null || v === '') p.delete(k);
        else p.set(k, v);
      }
      const qs = p.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [router, pathname, searchParams],
  );

  return { get: (k: string) => searchParams.get(k), set };
}

function CuentasContent() {
  const router = useRouter();
  const params = useQueryParams();
  const tab = (params.get('tab') as Tab | null) ?? 'corrientes';

  const [resumen, setResumen] = useState<DashboardResumen | null>(null);
  const [entidades, setEntidades] = useState<Entidad[]>([]);
  const [estado, setEstado] = useState<'loading' | 'error' | 'ready'>('loading');
  // Se incrementa después de cada alta/anulación para que las pestañas y
  // los totales se vuelvan a pedir.
  const [version, setVersion] = useState(0);
  // ?accion=pago / ?accion=obligacion abren el modal directo (accesos
  // rápidos del Inicio).
  const accionInicial = params.get('accion');
  const [modal, setModal] = useState<'obligacion' | 'pago' | null>(
    accionInicial === 'pago' ? 'pago' : accionInicial === 'obligacion' ? 'obligacion' : null,
  );

  const cargar = useCallback(async () => {
    try {
      // Dos pedidos ordenados en sentidos opuestos: así entran tanto los
      // saldos más grandes a favor como los más grandes en contra aunque
      // haya más de 100 entidades.
      const [r, desc, asc] = await Promise.all([
        getDashboardResumen(),
        listEntidades({ orderBy: 'saldo', orderDir: 'desc', take: 100 }),
        listEntidades({ orderBy: 'saldo', orderDir: 'asc', take: 100 }),
      ]);
      const porId = new Map([...desc.data, ...asc.data].map((e) => [e.id, e]));
      setResumen(r);
      setEntidades([...porId.values()]);
      setEstado('ready');
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        clearSession();
        router.push('/login');
        return;
      }
      setEstado('error');
    }
  }, [router]);

  useEffect(() => {
    if (!getUsuario()) {
      router.replace('/login');
      return;
    }
    cargar();
  }, [cargar, router, version]);

  function cerrarModal() {
    setModal(null);
    if (params.get('accion')) params.set({ accion: null });
  }

  function despuesDeCambio() {
    cerrarModal();
    setVersion((v) => v + 1);
  }

  if (estado === 'loading' && !resumen) return <CuentasSkeleton />;
  if (estado === 'error' && !resumen) return <ErrorState onRetry={cargar} />;
  if (!resumen) return null;

  const conSaldo = entidades.filter((e) => Number(e.cuentaCorriente?.saldoActual ?? 0) !== 0);
  const activas = entidades.filter((e) => e.activo).sort((a, b) => a.nombre.localeCompare(b.nombre));

  const TABS: { id: Tab; label: string; count?: number }[] = [
    { id: 'corrientes', label: 'Cuentas corrientes', count: conSaldo.length },
    { id: 'obligaciones', label: 'Obligaciones' },
    { id: 'pagos', label: 'Pagos' },
  ];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-4 nav:flex-row nav:items-end nav:justify-between">
        <div>
          <h1 className="font-serif text-[26px] font-semibold text-ink nav:text-[28px]">Cuentas</h1>
          <p className="mt-1 text-[14px] text-ink-soft">Lo que te deben, lo que debés y cómo se va pagando.</p>
        </div>
        <div className="flex gap-2.5">
          <Button
            variant="secondary"
            onClick={() => setModal('obligacion')}
            className="flex-1 gap-1.5 px-3 whitespace-nowrap sm:px-5 nav:flex-none"
          >
            <Plus className="hidden h-4 w-4 sm:block" aria-hidden />
            Nueva obligación
          </Button>
          <Button onClick={() => setModal('pago')} className="flex-1 px-3 whitespace-nowrap sm:px-5 nav:flex-none">
            Registrar pago
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:gap-3.5">
        <TotalCard
          acento="verde"
          label="Te deben"
          valor={resumen.aCobrar.total}
          detalle={
            resumen.aCobrar.vencido > 0
              ? `${formatMonto(resumen.aCobrar.vencido)} vencidos`
              : `${resumen.aCobrar.cantidad} ${resumen.aCobrar.cantidad === 1 ? 'obligación' : 'obligaciones'}`
          }
          detalleAlerta={resumen.aCobrar.vencido > 0}
          href="/cuentas?tab=obligaciones&dir=a_cobrar"
        />
        <TotalCard
          acento="neg"
          label="Debés"
          valor={resumen.aPagar.total}
          detalle={
            resumen.aPagar.vencido > 0
              ? `${formatMonto(resumen.aPagar.vencido)} vencidos`
              : resumen.aPagar.vencenEstaSemana > 0
                ? `${resumen.aPagar.vencenEstaSemana} vencen esta semana`
                : `${resumen.aPagar.cantidad} ${resumen.aPagar.cantidad === 1 ? 'obligación' : 'obligaciones'}`
          }
          detalleAlerta={resumen.aPagar.vencido > 0}
          href="/cuentas?tab=obligaciones&dir=a_pagar"
        />
      </div>

      <div
        role="tablist"
        aria-label="Secciones de Cuentas"
        className="-mx-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none] nav:mx-0 nav:px-0 [&::-webkit-scrollbar]:hidden"
      >
        {TABS.map((t) => {
          const activo = t.id === tab;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={activo}
              // Cambiar de pestaña limpia los filtros de la anterior.
              onClick={() => params.set({ tab: t.id === 'corrientes' ? null : t.id, dir: null, estado: null, con: null, saldo: null })}
              className={`inline-flex min-h-10 flex-shrink-0 items-center gap-1.5 rounded-full px-4 text-[13.5px] font-semibold whitespace-nowrap transition-colors duration-[120ms]
                ${activo ? 'bg-ink text-white' : 'border border-input-border bg-white text-ink-soft hover:bg-[#F7F2E9]'}`}
            >
              {t.label}
              {t.count !== undefined && (
                <span className={`tabular ${activo ? 'text-white/70' : 'text-muted'}`}>{t.count}</span>
              )}
            </button>
          );
        })}
      </div>

      <div role="tabpanel">
        {tab === 'corrientes' && <CorrientesTab entidades={conSaldo} />}
        {tab === 'obligaciones' && <ObligacionesTab version={version} onCambio={() => setVersion((v) => v + 1)} />}
        {tab === 'pagos' && <PagosTab version={version} onCambio={() => setVersion((v) => v + 1)} />}
      </div>

      {modal === 'obligacion' && (
        <NuevaObligacionModal entidades={activas} onClose={cerrarModal} onCreated={despuesDeCambio} />
      )}
      {modal === 'pago' && (
        <RegistrarPagoModal entidades={activas} onClose={cerrarModal} onCreated={despuesDeCambio} />
      )}
    </div>
  );
}

function TotalCard({
  acento,
  label,
  valor,
  detalle,
  detalleAlerta,
  href,
}: {
  acento: 'verde' | 'neg';
  label: string;
  valor: number;
  detalle: string;
  detalleAlerta: boolean;
  href: string;
}) {
  return (
    <Link
      href={href}
      className={`flex min-w-0 flex-col gap-0.5 rounded-xl border border-l-4 border-line bg-paper p-4 no-underline transition-colors duration-[120ms] hover:bg-paper-hover hover:no-underline nav:p-5
        ${acento === 'verde' ? 'border-l-verde' : 'border-l-neg'}`}
    >
      <span className="text-[13px] font-semibold text-ink-soft">{label}</span>
      <span className="truncate font-serif text-[22px] leading-tight font-semibold text-ink tabular sm:text-[28px] nav:text-[32px]">
        {formatMonto(valor)}
      </span>
      <span className={`truncate text-[12.5px] ${detalleAlerta ? 'font-semibold text-warn-on-soft' : 'text-muted'}`}>
        {detalle}
      </span>
    </Link>
  );
}

function CorrientesTab({ entidades }: { entidades: Entidad[] }) {
  const params = useQueryParams();
  const filtro = params.get('saldo') as 'pos' | 'neg' | null;
  const saldo = (e: Entidad) => Number(e.cuentaCorriente?.saldoActual ?? 0);
  const aFavor = entidades.filter((e) => saldo(e) > 0);
  const enContra = entidades.filter((e) => saldo(e) < 0);
  const visibles = (filtro === 'pos' ? aFavor : filtro === 'neg' ? enContra : entidades)
    // Las más grandes primero, sin importar el signo: es lo que más pesa.
    .slice()
    .sort((a, b) => Math.abs(saldo(b)) - Math.abs(saldo(a)));

  if (entidades.length === 0) {
    return (
      <EmptyState
        icon={Scale}
        title="Están todos al día"
        description="Ninguna entidad tiene saldo abierto. Cuando emitas un remito o cargues una obligación, aparece acá."
      />
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        <Chip active={!filtro} onClick={() => params.set({ saldo: null })}>
          Todas {entidades.length}
        </Chip>
        <Chip active={filtro === 'pos'} onClick={() => params.set({ saldo: 'pos' })}>
          Te deben {aFavor.length}
        </Chip>
        <Chip active={filtro === 'neg'} onClick={() => params.set({ saldo: 'neg' })}>
          Les debés {enContra.length}
        </Chip>
      </div>
      <ul className="overflow-hidden rounded-xl border border-line bg-paper">
        {visibles.map((e) => {
          const s = formatSaldo(saldo(e));
          const color = s.color === 'verde' ? 'text-verde' : s.color === 'neg' ? 'text-neg' : 'text-muted';
          return (
            <li key={e.id} className="border-b border-line-soft last:border-0">
              <Link
                href={`/cuentas/corrientes/${e.id}`}
                className="flex items-center gap-3 px-4 py-3.5 no-underline transition-colors duration-[120ms] hover:bg-paper-hover hover:no-underline nav:px-5"
              >
                <Avatar nombre={e.nombre} tono={saldo(e) > 0 ? 'verde' : 'terra'} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-semibold text-ink">{e.nombre}</p>
                  <div className="mt-1 hidden sm:block">
                    <RoleBadgeRow
                      cliente={!!e.cliente}
                      proveedor={!!e.proveedor}
                      acreedor={!!e.acreedor}
                      activo={e.activo}
                    />
                  </div>
                </div>
                <div className="flex-shrink-0 text-right">
                  <p className={`font-serif text-[17px] font-semibold tabular nav:text-[18px] ${color}`}>{s.texto}</p>
                  <p className="text-[12px] text-muted">{s.leyenda}</p>
                </div>
                <ChevronRight className="h-4 w-4 flex-shrink-0 text-muted" aria-hidden />
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** Listado paginado con "Ver más": mantiene lo ya cargado atenuado mientras trae lo nuevo. */
function usePaginado<T>(
  pedir: (skip: number) => Promise<{ data: T[]; total: number }>,
  deps: unknown[],
) {
  const [items, setItems] = useState<T[]>([]);
  const [total, setTotal] = useState(0);
  const [estado, setEstado] = useState<'loading' | 'error' | 'ready'>('loading');
  const [cargandoMas, setCargandoMas] = useState(false);

  const recargar = useCallback(async () => {
    setEstado('loading');
    try {
      const res = await pedir(0);
      setItems(res.data);
      setTotal(res.total);
      setEstado('ready');
    } catch {
      setEstado('error');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    recargar();
  }, [recargar]);

  async function verMas() {
    setCargandoMas(true);
    try {
      const res = await pedir(items.length);
      setItems((prev) => [...prev, ...res.data]);
      setTotal(res.total);
    } finally {
      setCargandoMas(false);
    }
  }

  return { items, total, estado, recargar, verMas, cargandoMas };
}

function ObligacionesTab({ version, onCambio }: { version: number; onCambio: () => void }) {
  const params = useQueryParams();
  const dir = params.get('dir') as Obligacion['direccion'] | null;
  const estado = params.get('estado') === 'todas' ? 'todas' : 'abiertas';
  const con = params.get('con') as 'proveedor' | 'acreedor' | 'gasto' | null;
  const [errorAccion, setErrorAccion] = useState<string | null>(null);

  const lista = usePaginado(
    (skip) =>
      listObligaciones({
        direccion: dir ?? undefined,
        estado: estado === 'abiertas' ? 'abiertas' : undefined,
        tipoEntidad: con === 'proveedor' || con === 'acreedor' ? con : undefined,
        sinEntidad: con === 'gasto' ? true : undefined,
        skip,
        take: PAGINA,
      }),
    [dir, estado, con, version],
  );

  async function anular(id: string) {
    setErrorAccion(null);
    try {
      await anularObligacion(id);
      onCambio();
    } catch (err) {
      setErrorAccion(err instanceof ApiError ? err.message : 'Error de conexión');
    }
  }

  const hayFiltros = !!dir || estado === 'todas' || !!con;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2.5 md:flex-row md:flex-wrap md:items-center">
        <div className="md:w-[220px]">
          <Segmented
            label="Estado"
            size="sm"
            options={[
              { value: 'abiertas', label: 'Abiertas' },
              { value: 'todas', label: 'Todas' },
            ]}
            value={estado}
            onChange={(v) => params.set({ estado: v === 'abiertas' ? null : v })}
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Chip active={!dir} onClick={() => params.set({ dir: null })}>
            Todas
          </Chip>
          <Chip active={dir === 'a_cobrar'} onClick={() => params.set({ dir: 'a_cobrar' })}>
            Te deben
          </Chip>
          <Chip active={dir === 'a_pagar'} onClick={() => params.set({ dir: 'a_pagar' })}>
            Debés
          </Chip>
          <label className="relative inline-flex">
            <span className="sr-only">Con quién</span>
            <select
              value={con ?? ''}
              onChange={(e) => params.set({ con: e.target.value || null })}
              className={`min-h-9 appearance-none rounded-full border py-1.5 pr-8 pl-4 text-[13.5px] font-medium transition-colors duration-[120ms]
                ${con ? 'border-ink bg-ink text-white' : 'border-input-border bg-white text-ink-soft'}`}
            >
              <option value="">Con cualquiera</option>
              <option value="proveedor">Proveedores</option>
              <option value="acreedor">Acreedores</option>
              <option value="gasto">Gastos generales</option>
            </select>
            <ChevronDown
              className={`pointer-events-none absolute top-1/2 right-3 h-3.5 w-3.5 -translate-y-1/2 ${con ? 'text-white' : 'text-muted'}`}
              aria-hidden
            />
          </label>
        </div>
      </div>

      {errorAccion && <AlertBanner variant="error">{errorAccion}</AlertBanner>}

      {lista.estado === 'error' && lista.items.length === 0 ? (
        <ErrorState onRetry={lista.recargar} />
      ) : lista.estado === 'loading' && lista.items.length === 0 ? (
        <Skeleton className="h-[240px] rounded-xl !bg-[#F5F0E7]" />
      ) : (
        <div className={`transition-opacity duration-[120ms] ${lista.estado === 'loading' ? 'opacity-50' : ''}`}>
          <p className="mb-2 text-[13px] text-muted" aria-live="polite">
            {lista.total} {lista.total === 1 ? 'obligación' : 'obligaciones'}
          </p>
          <ObligacionesLista
            obligaciones={lista.items}
            onAnular={anular}
            mostrarEntidad
            vacio={hayFiltros ? 'No hay obligaciones con estos filtros.' : 'No hay obligaciones abiertas. Todo al día.'}
          />
          <VerMas cargadas={lista.items.length} total={lista.total} cargando={lista.cargandoMas} onClick={lista.verMas} />
        </div>
      )}
    </div>
  );
}

function PagosTab({ version, onCambio }: { version: number; onCambio: () => void }) {
  const [errorAccion, setErrorAccion] = useState<string | null>(null);
  const lista = usePaginado<Pago>((skip) => listPagos({ skip, take: PAGINA }), [version]);

  async function anular(id: string) {
    setErrorAccion(null);
    try {
      await anularPago(id);
      onCambio();
    } catch (err) {
      setErrorAccion(err instanceof ApiError ? err.message : 'Error de conexión');
    }
  }

  if (lista.estado === 'error' && lista.items.length === 0) return <ErrorState onRetry={lista.recargar} />;
  if (lista.estado === 'loading' && lista.items.length === 0) {
    return <Skeleton className="h-[240px] rounded-xl !bg-[#F5F0E7]" />;
  }

  return (
    <div className={`flex flex-col gap-3 transition-opacity duration-[120ms] ${lista.estado === 'loading' ? 'opacity-50' : ''}`}>
      {errorAccion && <AlertBanner variant="error">{errorAccion}</AlertBanner>}
      <PagosLista pagos={lista.items} onAnular={anular} mostrarEntidad />
      <VerMas cargadas={lista.items.length} total={lista.total} cargando={lista.cargandoMas} onClick={lista.verMas} />
    </div>
  );
}

function VerMas({
  cargadas,
  total,
  cargando,
  onClick,
}: {
  cargadas: number;
  total: number;
  cargando: boolean;
  onClick: () => void;
}) {
  if (cargadas >= total) return null;
  return (
    <div className="mt-3 flex items-center justify-between gap-3 text-[13px] text-muted">
      <span>
        {cargadas} de {total}
      </span>
      <Button variant="secondary" onClick={onClick} disabled={cargando} className="min-h-9 px-4 text-[13.5px]">
        {cargando ? 'Cargando…' : 'Ver más'}
      </Button>
    </div>
  );
}

function CuentasSkeleton() {
  return (
    <div className="flex flex-col gap-5" aria-hidden>
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-4 w-72 !bg-[#F5F0E7]" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Card className="flex flex-col gap-2">
          <Skeleton className="h-3.5 w-20" />
          <Skeleton className="h-7 w-32 !bg-[#F5F0E7]" />
        </Card>
        <Card className="flex flex-col gap-2">
          <Skeleton className="h-3.5 w-20" />
          <Skeleton className="h-7 w-32 !bg-[#F5F0E7]" />
        </Card>
      </div>
      <Skeleton className="h-10 w-full max-w-md rounded-full" />
      <Skeleton className="h-[260px] rounded-xl !bg-[#F5F0E7]" />
    </div>
  );
}
