'use client';

import { Suspense, use, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { ChevronRight, FileDown, Plus, UserX } from 'lucide-react';
import { Shell } from '@/components/Shell';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { EmptyState } from '@/components/ui/EmptyState';
import { AlertBanner } from '@/components/ui/AlertBanner';
import { RoleBadgeRow } from '@/components/ui/RoleBadge';
import { SaldoHero } from '@/components/cuentas/SaldoHero';
import { MovimientosLista } from '@/components/cuentas/MovimientosLista';
import { ObligacionesLista } from '@/components/cuentas/ObligacionesLista';
import { PagosLista } from '@/components/cuentas/PagosLista';
import { NuevaObligacionModal } from '@/components/cuentas/NuevaObligacionModal';
import { RegistrarPagoModal } from '@/components/cuentas/RegistrarPagoModal';
import {
  ApiError,
  CuentaCorriente,
  Entidad,
  Obligacion,
  Pago,
  anularObligacion,
  anularPago,
  clearSession,
  getCuentaCorriente,
  getEntidad,
  getUsuario,
  listObligaciones,
  listPagos,
} from '@/lib/api';
import { formatFechaCorta, formatMonto } from '@/lib/format';

type Tab = 'movimientos' | 'obligaciones' | 'pagos' | 'datos';

type Datos = {
  entidad: Entidad;
  cuenta: CuentaCorriente;
  obligaciones: Obligacion[];
  pagos: Pago[];
};

const esAbierta = (o: Obligacion) => o.estado === 'pendiente' || o.estado === 'parcial';

function contar(n: number, singular: string, plural: string): string | null {
  return n > 0 ? `${n} ${n === 1 ? singular : plural}` : null;
}

/** "1 vencida · 1 parcial · 1 pendiente" -- una vencida no se cuenta de nuevo como pendiente. */
function resumenAbiertas(abiertas: Obligacion[]): string {
  if (abiertas.length === 0) return 'Nada pendiente';
  return [
    contar(abiertas.filter((o) => o.vencida).length, 'vencida', 'vencidas'),
    contar(abiertas.filter((o) => o.estado === 'parcial' && !o.vencida).length, 'parcial', 'parciales'),
    contar(abiertas.filter((o) => o.estado === 'pendiente' && !o.vencida).length, 'pendiente', 'pendientes'),
  ]
    .filter(Boolean)
    .join(' · ');
}

export default function CuentaCorrientePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <Shell>
      <Suspense fallback={<CuentaSkeleton />}>
        <CuentaCorrienteContent id={id} />
      </Suspense>
    </Shell>
  );
}

function CuentaCorrienteContent({ id }: { id: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tab = (searchParams.get('tab') as Tab | null) ?? 'movimientos';

  const [datos, setDatos] = useState<Datos | null>(null);
  const [estado, setEstado] = useState<'loading' | 'error' | 'notfound' | 'ready'>('loading');
  // ?accion=cobrar (botón "Cobrar" del Inicio) abre el modal de cobro directo.
  const [modal, setModal] = useState<'obligacion' | 'pago' | null>(
    searchParams.get('accion') === 'cobrar' ? 'pago' : null,
  );

  function cerrarModal() {
    setModal(null);
    if (searchParams.get('accion')) {
      const p = new URLSearchParams(searchParams.toString());
      p.delete('accion');
      const qs = p.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    }
  }
  const [errorAccion, setErrorAccion] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    try {
      const [entidad, cuenta, obligaciones, pagos] = await Promise.all([
        getEntidad(id),
        getCuentaCorriente(id),
        listObligaciones({ entidadId: id, take: 100 }),
        listPagos({ entidadId: id, take: 100 }),
      ]);
      setDatos({ entidad, cuenta, obligaciones: obligaciones.data, pagos: pagos.data });
      setEstado('ready');
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        clearSession();
        router.push('/login');
        return;
      }
      setEstado(err instanceof ApiError && err.status === 404 ? 'notfound' : 'error');
    }
  }, [id, router]);

  useEffect(() => {
    if (!getUsuario()) {
      router.replace('/login');
      return;
    }
    cargar();
  }, [cargar, router]);

  function irATab(t: Tab) {
    const p = new URLSearchParams(searchParams.toString());
    if (t === 'movimientos') p.delete('tab');
    else p.set('tab', t);
    const qs = p.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  async function accion(fn: () => Promise<unknown>) {
    setErrorAccion(null);
    try {
      await fn();
      await cargar();
    } catch (err) {
      setErrorAccion(err instanceof ApiError ? err.message : 'Error de conexión');
    }
  }

  const derivados = useMemo(() => {
    if (!datos) return null;
    const saldo = Number(datos.cuenta.saldoActual);
    const e = datos.entidad;
    const dirSaldo: Obligacion['direccion'] =
      saldo > 0 ? 'a_cobrar' : saldo < 0 ? 'a_pagar' : e.cliente || !(e.proveedor || e.acreedor) ? 'a_cobrar' : 'a_pagar';
    const abiertas = datos.obligaciones.filter(esAbierta);
    const vencidasDir = abiertas
      .filter((o) => o.vencida && o.direccion === dirSaldo && o.fechaVencimiento)
      .sort((a, b) => Date.parse(a.fechaVencimiento!) - Date.parse(b.fechaVencimiento!));
    const proxima = abiertas
      .filter((o) => !o.vencida && o.direccion === dirSaldo && o.fechaVencimiento)
      .sort((a, b) => Date.parse(a.fechaVencimiento!) - Date.parse(b.fechaVencimiento!))[0];

    const pagosVigentes = datos.pagos.filter((p) => p.estado !== 'rechazado');
    const ultimoPago =
      pagosVigentes.find((p) => p.aplicaciones.some((a) => a.obligacion?.direccion === dirSaldo)) ??
      pagosVigentes[0] ??
      null;
    const hoy = new Date(new Date().toDateString()).getTime();
    const chequesPendientes = pagosVigentes
      .flatMap((p) => p.cheques)
      .filter((c) => !c.fechaCobro || Date.parse(c.fechaCobro) >= hoy)
      .sort((a, b) => (a.fechaCobro ? Date.parse(a.fechaCobro) : Infinity) - (b.fechaCobro ? Date.parse(b.fechaCobro) : Infinity));

    return {
      saldo,
      dirSaldo,
      abiertas,
      vencido: vencidasDir.reduce((s, o) => s + o.saldo, 0),
      masViejaVencida: vencidasDir[0]?.fechaVencimiento ?? null,
      proximoVencimiento: proxima?.fechaVencimiento ?? null,
      ultimoPago,
      chequesPendientes,
    };
  }, [datos]);

  if (estado === 'loading') return <CuentaSkeleton />;
  if (estado === 'error') return <ErrorState onRetry={() => { setEstado('loading'); cargar(); }} />;
  if (estado === 'notfound' || !datos || !derivados) {
    return (
      <EmptyState
        icon={UserX}
        title="No encontramos esa entidad"
        description="Puede que la hayan borrado o que el link esté mal."
        action={
          <Link href="/entidades" className="font-semibold">
            Volver a Entidades
          </Link>
        }
      />
    );
  }

  const { entidad, cuenta, obligaciones, pagos } = datos;
  const { saldo, dirSaldo, abiertas } = derivados;
  const esCobro = dirSaldo === 'a_cobrar';

  const acciones = (
    <>
      <Button
        variant="secondary"
        disabled
        title="Todavía no disponible"
        className="order-3 gap-1.5 nav:order-1"
      >
        <FileDown className="h-4 w-4" aria-hidden />
        Resumen en PDF
      </Button>
      <Button variant="secondary" onClick={() => setModal('obligacion')} className="order-2 gap-1.5">
        <Plus className="h-4 w-4" aria-hidden />
        Nueva obligación
      </Button>
      <Button onClick={() => setModal('pago')} className="order-1 nav:order-3">
        {esCobro ? 'Registrar cobro' : 'Registrar pago'}
      </Button>
    </>
  );

  const TABS: { id: Tab; label: string; count?: number }[] = [
    { id: 'movimientos', label: 'Movimientos', count: cuenta.movimientos.length },
    { id: 'obligaciones', label: 'Obligaciones', count: obligaciones.length },
    { id: 'pagos', label: 'Pagos y cheques', count: pagos.length },
    { id: 'datos', label: 'Datos' },
  ];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 nav:flex-row nav:items-center nav:justify-between">
        <nav aria-label="Ruta" className="flex min-w-0 items-center gap-1.5 text-[13.5px] text-muted">
          <Link href="/cuentas" className="font-medium text-ink-soft">
            Cuentas
          </Link>
          <ChevronRight className="h-3.5 w-3.5 flex-shrink-0" aria-hidden />
          <Link href="/cuentas?tab=corrientes" className="hidden font-medium text-ink-soft sm:inline">
            Cuentas corrientes
          </Link>
          <ChevronRight className="hidden h-3.5 w-3.5 flex-shrink-0 sm:inline" aria-hidden />
          <span aria-current="page" className="truncate font-semibold text-ink">
            {entidad.nombre}
          </span>
        </nav>
        <div className="hidden gap-2.5 nav:flex">{acciones}</div>
      </div>

      <div className="grid gap-4 nav:grid-cols-[minmax(0,1fr)_300px]">
        <SaldoHero
          entidad={entidad}
          saldo={saldo}
          vencido={derivados.vencido}
          masViejaVencida={derivados.masViejaVencida}
          proximoVencimiento={derivados.proximoVencimiento}
        />

        {/* Mobile: acciones justo debajo del saldo, la principal primero */}
        <div className="flex flex-col gap-2.5 sm:flex-row nav:hidden [&>button]:w-full sm:[&>button]:w-auto">
          {acciones}
        </div>

        <div className="grid gap-3 sm:grid-cols-3 nav:grid-cols-1">
          <MiniCard titulo="Obligaciones abiertas">
            <p className="font-serif text-[22px] font-semibold text-ink tabular">{abiertas.length}</p>
            <p className="text-[12.5px] text-muted">{resumenAbiertas(abiertas)}</p>
          </MiniCard>
          <MiniCard titulo={esCobro ? 'Último cobro' : 'Último pago'}>
            {derivados.ultimoPago ? (
              <>
                <p className="font-serif text-[22px] font-semibold text-ink tabular">
                  {formatMonto(derivados.ultimoPago.monto)}
                </p>
                <p className="text-[12.5px] text-muted">
                  {formatFechaCorta(derivados.ultimoPago.fecha)}
                  {derivados.ultimoPago.medio && ` · ${derivados.ultimoPago.medio}`}
                </p>
              </>
            ) : (
              <p className="text-[13.5px] text-ink-soft">Todavía no hay</p>
            )}
          </MiniCard>
          <MiniCard titulo={esCobro ? 'Cheques en cartera' : 'Cheques entregados'}>
            {derivados.chequesPendientes.length > 0 ? (
              <>
                <p className="font-serif text-[22px] font-semibold text-ink tabular">
                  {derivados.chequesPendientes.length} ·{' '}
                  {formatMonto(derivados.chequesPendientes.reduce((s, c) => s + Number(c.monto ?? 0), 0))}
                </p>
                <p className="text-[12.5px] text-muted">
                  {derivados.chequesPendientes[0].fechaCobro
                    ? `El próximo se cobra el ${formatFechaCorta(derivados.chequesPendientes[0].fechaCobro)}`
                    : 'Sin fecha de cobro'}
                  {derivados.chequesPendientes[0].banco && ` · ${derivados.chequesPendientes[0].banco}`}
                </p>
              </>
            ) : (
              <p className="text-[13.5px] text-ink-soft">Ninguno pendiente</p>
            )}
          </MiniCard>
        </div>
      </div>

      <div
        role="tablist"
        aria-label="Secciones de la cuenta"
        ref={(el) => {
          // En celular la fila se desplaza de costado: si se entra con
          // ?tab=datos, llevar la pestaña activa a la vista (solo en
          // horizontal, sin mover el scroll de la página).
          const activa = el?.querySelector<HTMLElement>('[aria-selected="true"]');
          if (el && activa) el.scrollLeft = Math.max(0, activa.offsetLeft - 16);
        }}
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
              onClick={() => irATab(t.id)}
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

      {errorAccion && <AlertBanner variant="error">{errorAccion}</AlertBanner>}

      <div role="tabpanel">
        {tab === 'movimientos' && <MovimientosLista movimientos={cuenta.movimientos} />}
        {tab === 'obligaciones' && (
          <ObligacionesLista
            obligaciones={obligaciones}
            onAnular={(oid) => accion(() => anularObligacion(oid))}
          />
        )}
        {tab === 'pagos' && <PagosLista pagos={pagos} onAnular={(pid) => accion(() => anularPago(pid))} />}
        {tab === 'datos' && <DatosEntidad entidad={entidad} />}
      </div>

      {modal === 'obligacion' && (
        <NuevaObligacionModal
          entidadId={entidad.id}
          direccionSugerida={dirSaldo}
          onClose={cerrarModal}
          onCreated={() => {
            cerrarModal();
            cargar();
          }}
        />
      )}
      {modal === 'pago' && (
        <RegistrarPagoModal
          entidad={{ id: entidad.id, nombre: entidad.nombre }}
          obligaciones={obligaciones}
          direccionInicial={dirSaldo}
          onClose={cerrarModal}
          onCreated={() => {
            cerrarModal();
            cargar();
          }}
        />
      )}
    </div>
  );
}

function MiniCard({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <Card padded={false} className="px-4 py-3.5">
      <p className="mb-1 text-[12px] font-bold tracking-[0.1em] text-muted uppercase">{titulo}</p>
      {children}
    </Card>
  );
}

function DatosEntidad({ entidad }: { entidad: Entidad }) {
  const filas: [string, React.ReactNode][] = [
    ['Nombre', entidad.nombre],
    ['Documento', entidad.documentoNro ? `${entidad.documentoTipo ?? 'Doc.'} ${entidad.documentoNro}` : '—'],
    ['Email', entidad.email ?? '—'],
    ['Teléfono', entidad.telefono ?? '—'],
    ['Dirección', entidad.direccion ?? '—'],
    [
      'Roles',
      <RoleBadgeRow
        key="roles"
        cliente={!!entidad.cliente}
        proveedor={!!entidad.proveedor}
        acreedor={!!entidad.acreedor}
        activo={entidad.activo}
      />,
    ],
    ['Estado', entidad.activo ? 'Activa' : 'Dada de baja'],
  ];
  return (
    <Card>
      <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
        {filas.map(([label, valor]) => (
          <div key={label} className="min-w-0">
            <dt className="text-[12px] font-bold tracking-[0.1em] text-muted uppercase">{label}</dt>
            <dd className="mt-1 text-[15px] break-words text-ink">{valor}</dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}

function CuentaSkeleton() {
  return (
    <div className="flex flex-col gap-5" aria-hidden>
      <Skeleton className="h-4 w-64" />
      <div className="grid gap-4 nav:grid-cols-[minmax(0,1fr)_300px]">
        <Skeleton className="h-[230px] rounded-2xl !bg-[#F5F0E7]" />
        <div className="grid gap-3 sm:grid-cols-3 nav:grid-cols-1">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-[86px] rounded-xl" />
          ))}
        </div>
      </div>
      <Skeleton className="h-10 w-full max-w-md rounded-full" />
      <Skeleton className="h-[260px] rounded-xl !bg-[#F5F0E7]" />
    </div>
  );
}
