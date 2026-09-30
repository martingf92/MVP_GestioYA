'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Clock,
  X,
  FileText,
  Wallet,
  UserPlus,
  ListTodo,
  Plus,
  Check,
  Users,
} from 'lucide-react';
import { Shell, avisarCambioTareas } from '@/components/Shell';
import { Card } from '@/components/ui/Card';
import { buttonClasses } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { Skeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { EmptyState } from '@/components/ui/EmptyState';
import { FlujoSection } from '@/components/dashboard/FlujoSection';
import {
  ApiError,
  DashboardResumen,
  Tarea,
  Usuario,
  clearSession,
  getDashboardResumen,
  getRecordatorios,
  getUsuario,
  listEntidades,
  listTareas,
  updateTareaEstado,
} from '@/lib/api';
import { diasDesde, formatFechaCorta, formatMonto } from '@/lib/format';

const BANNER_KEY = 'gestioya_banner_descartado';

function saludo(): string {
  const h = new Date().getHours();
  if (h < 13) return 'Buen día';
  if (h < 20) return 'Buenas tardes';
  return 'Buenas noches';
}

function hoyYmd(): string {
  return new Date().toLocaleDateString('en-CA');
}

export default function InicioPage() {
  const router = useRouter();
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [resumen, setResumen] = useState<DashboardResumen | null>(null);
  const [tareas, setTareas] = useState<Tarea[]>([]);
  const [recordatorios, setRecordatorios] = useState(0);
  const [sinEntidades, setSinEntidades] = useState(false);
  const [estado, setEstado] = useState<'loading' | 'error' | 'ready'>('loading');
  const [bannerDescartado, setBannerDescartado] = useState(true);

  const cargar = useCallback(async () => {
    setEstado('loading');
    try {
      const [r, t, rec, ent] = await Promise.all([
        getDashboardResumen(),
        listTareas(),
        getRecordatorios(),
        listEntidades({ take: 1 }),
      ]);
      setResumen(r);
      // Solo pendientes al cargar; las que se tildan acá quedan visibles
      // (tachadas) hasta recargar, para poder destildar si fue sin querer.
      setTareas(t.data.filter((x) => x.estado !== 'cumplida'));
      setRecordatorios(rec.length);
      setSinEntidades(ent.total === 0);
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
    const u = getUsuario();
    if (!u) {
      router.replace('/login');
      return;
    }
    setUsuario(u);
    // El descarte del banner dura el día: si mañana sigue habiendo
    // vencidos, vuelve a aparecer (ver README del handoff).
    try {
      setBannerDescartado(sessionStorage.getItem(BANNER_KEY) === hoyYmd());
    } catch {
      setBannerDescartado(false);
    }
    cargar();
  }, [cargar, router]);

  function descartarBanner() {
    setBannerDescartado(true);
    try {
      sessionStorage.setItem(BANNER_KEY, hoyYmd());
    } catch {
      // sin storage disponible: el descarte dura hasta recargar la página
    }
  }

  async function toggleTarea(t: Tarea) {
    const nuevo = t.estado === 'cumplida' ? 'abierta' : 'cumplida';
    setTareas((prev) => prev.map((x) => (x.id === t.id ? { ...x, estado: nuevo } : x)));
    try {
      await updateTareaEstado(t.id, nuevo);
      avisarCambioTareas();
    } catch {
      setTareas((prev) => prev.map((x) => (x.id === t.id ? t : x)));
    }
  }

  const primerNombre = usuario?.nombre.split(' ')[0] ?? '';
  const tareasVencidas = tareas.filter((t) => t.vencida).length;
  const hayAlertas = recordatorios > 0 || tareasVencidas > 0;

  return (
    <Shell>
      {estado === 'error' && !resumen && <ErrorState onRetry={cargar} />}

      {estado === 'loading' && !resumen && <InicioSkeleton />}

      {resumen && sinEntidades && (
        <EmptyState
          icon={Users}
          title="Todavía no hay nada cargado"
          description="Empezá por tu primer cliente o proveedor: con eso ya podés emitir remitos y ver cómo viene la plata."
          action={
            <Link href="/entidades?nueva=1" className={buttonClasses('primary')}>
              Cargar tu primer cliente
            </Link>
          }
        />
      )}

      {resumen && !sinEntidades && (
        <div className="flex flex-col gap-6">
          <Encabezado nombre={primerNombre} resumen={resumen} />

          {hayAlertas && !bannerDescartado && (
            <BannerRecordatorios
              tareasVencidas={tareasVencidas}
              recordatorios={recordatorios}
              onDescartar={descartarBanner}
            />
          )}

          <Kpis resumen={resumen} />

          <FlujoSection />

          <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
            <ParaReclamar items={resumen.paraReclamar} />
            <div className="flex min-w-0 flex-col gap-5">
              <AccesosRapidos />
              <TusTareas tareas={tareas} onToggle={toggleTarea} />
            </div>
          </div>
        </div>
      )}
    </Shell>
  );
}

function Encabezado({ nombre, resumen }: { nombre: string; resumen: DashboardResumen }) {
  const neto = resumen.aCobrar.total - resumen.aPagar.total;
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <h1 className="font-serif text-[26px] font-semibold text-ink nav:text-[32px] nav:tracking-[-0.01em]">
          {saludo()}
          {nombre ? `, ${nombre}` : ''}
        </h1>
        <p className="mt-1.5 max-w-2xl text-[15px] leading-[1.55] text-ink-soft nav:text-[15.5px]">
          {neto >= 0 ? (
            <>
              Hoy te deben <strong className="font-semibold text-verde">{formatMonto(neto)}</strong> más
              de lo que debés.
            </>
          ) : (
            <>
              Hoy debés <strong className="font-semibold text-neg">{formatMonto(neto)}</strong> más de lo
              que te deben.
            </>
          )}
          {resumen.aCobrar.vencido > 0 && (
            <>
              {' '}
              Hay{' '}
              <strong className="font-semibold text-warn">
                {formatMonto(resumen.aCobrar.vencido)} vencidos
              </strong>{' '}
              para reclamar.
            </>
          )}
        </p>
      </div>
      <div className="flex gap-2.5">
        <Link href="/entidades?nueva=1" className={buttonClasses('secondary', 'flex-1 lg:flex-none')}>
          Nueva entidad
        </Link>
        <Link href="/remitos/nuevo" className={buttonClasses('primary', 'flex-1 gap-1.5 lg:flex-none')}>
          <Plus className="h-4 w-4" aria-hidden />
          Nuevo remito
        </Link>
      </div>
    </div>
  );
}

function BannerRecordatorios({
  tareasVencidas,
  recordatorios,
  onDescartar,
}: {
  tareasVencidas: number;
  recordatorios: number;
  onDescartar: () => void;
}) {
  const partes = [
    tareasVencidas > 0 && `${tareasVencidas} ${tareasVencidas === 1 ? 'tarea vencida' : 'tareas vencidas'}`,
    recordatorios > 0 &&
      `${recordatorios} ${recordatorios === 1 ? 'recordatorio pendiente' : 'recordatorios pendientes'}`,
  ].filter(Boolean);

  return (
    <div
      role="status"
      className="flex items-start gap-3 rounded-xl border border-warn-soft-border bg-warn-banner px-4 py-3.5 nav:items-center"
    >
      <Clock className="mt-0.5 h-[17px] w-[17px] flex-shrink-0 text-warn nav:mt-0" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="text-[14.5px] font-semibold text-warn-strong">Tenés {partes.join(' y ')}</p>
        <p className="text-[13px] text-warn-on-soft">Mirá qué quedó pendiente antes de que se acumule.</p>
      </div>
      <Link
        href="/tareas"
        className={buttonClasses('secondary', 'hidden min-h-9 px-3.5 text-[13.5px] sm:inline-flex')}
      >
        Ver tareas
      </Link>
      <button
        type="button"
        onClick={onDescartar}
        aria-label="Descartar aviso por hoy"
        className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-warn-on-soft hover:bg-warn-soft"
      >
        <X className="h-4 w-4" aria-hidden />
      </button>
    </div>
  );
}

function Kpis({ resumen }: { resumen: DashboardResumen }) {
  const { aCobrar, aPagar, remitosMes } = resumen;
  return (
    <div className="grid gap-3.5 md:grid-cols-3">
      <KpiCard
        acento="verde"
        label="Te deben"
        valor={formatMonto(aCobrar.total)}
        detalle={
          <>
            {aCobrar.cantidad} {aCobrar.cantidad === 1 ? 'obligación abierta' : 'obligaciones abiertas'}
            {aCobrar.vencido > 0 && (
              <>
                {' · '}
                <span className="font-semibold text-warn-on-soft">
                  {formatMonto(aCobrar.vencido)} vencidos
                </span>
              </>
            )}
          </>
        }
      />
      <KpiCard
        acento="neg"
        label="Debés"
        valor={formatMonto(aPagar.total)}
        detalle={
          <>
            {aPagar.cantidad} {aPagar.cantidad === 1 ? 'obligación' : 'obligaciones'}
            {aPagar.vencenEstaSemana > 0 &&
              ` · ${aPagar.vencenEstaSemana} ${aPagar.vencenEstaSemana === 1 ? 'vence' : 'vencen'} esta semana`}
            {aPagar.cantidadVencidas > 0 && ` · ${aPagar.cantidadVencidas} vencidas`}
          </>
        }
      />
      <KpiCard
        label="Movimiento del mes"
        valor={`${remitosMes.total} ${remitosMes.total === 1 ? 'remito' : 'remitos'}`}
        detalle={
          <>
            {remitosMes.emitidos} {remitosMes.emitidos === 1 ? 'emitido' : 'emitidos'}
            {remitosMes.borradoresSinEmitir > 0 && (
              <>
                {' · '}
                <Link href="/remitos" className="font-semibold">
                  {remitosMes.borradoresSinEmitir} en borrador sin emitir
                </Link>
              </>
            )}
          </>
        }
      />
    </div>
  );
}

function KpiCard({
  acento,
  label,
  valor,
  detalle,
}: {
  acento?: 'verde' | 'neg';
  label: string;
  valor: string;
  detalle: React.ReactNode;
}) {
  const borde = acento === 'verde' ? 'border-l-4 border-l-verde' : acento === 'neg' ? 'border-l-4 border-l-neg' : '';
  return (
    <Card className={`flex flex-col gap-1 ${borde}`}>
      <p className="text-[13px] font-semibold text-ink-soft">{label}</p>
      <p className="font-serif text-[30px] leading-tight font-semibold text-ink tabular nav:text-[34px]">
        {valor}
      </p>
      <p className="text-[13px] leading-[1.5] text-muted">{detalle}</p>
    </Card>
  );
}

function ParaReclamar({ items }: { items: DashboardResumen['paraReclamar'] }) {
  return (
    <Card padded={false} className="min-w-0">
      <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
        <h2 className="font-serif text-[18px] font-semibold text-ink">Para reclamar primero</h2>
        <Link href="/cuentas?tab=obligaciones&dir=a_cobrar" className="text-[13px]">
          Ver todas
        </Link>
      </div>
      {items.length === 0 ? (
        <p className="px-5 py-8 text-center text-[14px] text-ink-soft">
          Nadie te debe nada por ahora.
        </p>
      ) : (
        <ul>
          {items.map((o) => {
            const vencimiento = !o.fechaVencimiento
              ? { texto: 'Sin fecha de vencimiento', clase: 'text-muted' }
              : o.vencida
                ? {
                    texto: `Venció hace ${diasDesde(o.fechaVencimiento)} ${diasDesde(o.fechaVencimiento) === 1 ? 'día' : 'días'}`,
                    clase: 'font-semibold text-warn-on-soft',
                  }
                : { texto: `Vence el ${formatFechaCorta(o.fechaVencimiento)}`, clase: 'text-muted' };
            return (
              <li
                key={o.id}
                className="flex items-center gap-3 border-b border-line-soft px-5 py-3.5 last:border-0"
              >
                <Avatar nombre={o.entidad.nombre} tono="verde" size={40} />
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/cuentas/corrientes/${o.entidad.id}`}
                    className="block truncate text-[15px] font-semibold text-ink no-underline hover:underline"
                  >
                    {o.entidad.nombre}
                  </Link>
                  <p className={`flex items-center gap-1 truncate text-[12.5px] ${vencimiento.clase}`}>
                    {o.vencida && <Clock className="h-3 w-3 flex-shrink-0" aria-hidden />}
                    {vencimiento.texto}
                    {o.descripcion && (
                      <span className="hidden font-normal text-muted sm:inline"> · {o.descripcion}</span>
                    )}
                  </p>
                </div>
                <div className="flex flex-shrink-0 flex-col items-end gap-1.5 sm:flex-row sm:items-center sm:gap-3">
                  <p className="font-serif text-[18px] font-semibold text-verde tabular nav:text-[20px]">
                    {formatMonto(o.saldo)}
                  </p>
                  <Link
                    href={`/cuentas/corrientes/${o.entidad.id}?accion=cobrar`}
                    aria-label={`Cobrarle a ${o.entidad.nombre}`}
                    className={buttonClasses('secondary', 'min-h-9 px-3.5 text-[13.5px]')}
                  >
                    Cobrar
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

const ACCESOS = [
  { href: '/remitos/nuevo', label: 'Cargar remito', icon: FileText },
  { href: '/cuentas?accion=pago', label: 'Registrar pago', icon: Wallet },
  { href: '/entidades?nueva=1', label: 'Nuevo cliente', icon: UserPlus },
  { href: '/tareas', label: 'Nueva tarea', icon: ListTodo },
] as const;

function AccesosRapidos() {
  return (
    <Card>
      <h2 className="mb-3 font-serif text-[18px] font-semibold text-ink">Accesos rápidos</h2>
      <div className="grid grid-cols-2 gap-2.5">
        {ACCESOS.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="flex min-h-[72px] flex-col justify-between gap-2 rounded-[10px] border border-line bg-white p-3 text-[13.5px] font-semibold text-ink no-underline transition-colors duration-[120ms] ease-out hover:border-verde hover:text-ink hover:no-underline"
          >
            <Icon className="h-[18px] w-[18px] text-verde" strokeWidth={1.75} aria-hidden />
            {label}
          </Link>
        ))}
      </div>
    </Card>
  );
}

function TusTareas({ tareas, onToggle }: { tareas: Tarea[]; onToggle: (t: Tarea) => void }) {
  const visibles = tareas.slice(0, 5);
  return (
    <Card>
      <div className="mb-2 flex items-center justify-between">
        <h2 className="font-serif text-[18px] font-semibold text-ink">Tus tareas</h2>
        <Link href="/tareas" className="text-[13px]">
          Ver todas
        </Link>
      </div>
      {visibles.length === 0 ? (
        <p className="py-4 text-[14px] text-ink-soft">No tenés tareas pendientes.</p>
      ) : (
        <ul className="flex flex-col">
          {visibles.map((t) => {
            const cumplida = t.estado === 'cumplida';
            return (
              <li key={t.id} className={`flex items-start gap-3 py-2.5 ${cumplida ? 'opacity-50' : ''}`}>
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={cumplida}
                  aria-label={cumplida ? `Marcar "${t.titulo}" como pendiente` : `Marcar "${t.titulo}" como cumplida`}
                  onClick={() => onToggle(t)}
                  className={`relative mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-[6px] border transition-colors duration-[120ms]
                    before:absolute before:-inset-3 before:content-['']
                    ${cumplida ? 'border-verde bg-verde' : 'border-input-border bg-white hover:border-verde'}`}
                >
                  {cumplida && <Check className="h-3.5 w-3.5 text-white" aria-hidden />}
                </button>
                <div className="min-w-0">
                  <p className={`text-[14px] font-medium text-ink ${cumplida ? 'line-through' : ''}`}>{t.titulo}</p>
                  {t.fechaVencimiento && (
                    <p className={`text-[12.5px] ${t.vencida && !cumplida ? 'font-semibold text-neg' : 'text-muted'}`}>
                      {t.vencida && !cumplida ? 'Venció el ' : 'Vence el '}
                      {formatFechaCorta(t.fechaVencimiento)}
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

function InicioSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-hidden>
      <div className="flex flex-col gap-2.5">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-full max-w-md !bg-[#F5F0E7]" />
      </div>
      <div className="grid gap-3.5 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-2.5 rounded-xl border border-line bg-paper p-5">
            <Skeleton className="h-3.5 w-20" />
            <Skeleton className="h-8 w-36 !bg-[#F5F0E7]" />
            <Skeleton className="h-3 w-40" />
          </div>
        ))}
      </div>
      <Skeleton className="h-[300px] w-full rounded-xl !bg-[#F5F0E7]" />
    </div>
  );
}
