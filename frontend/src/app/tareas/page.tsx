'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { ArrowDown, ArrowUp, Bell, Check, Clock, ListTodo, Plus, Search, X } from 'lucide-react';
import { Shell, avisarCambioTareas } from '@/components/Shell';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { Field } from '@/components/ui/Field';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Segmented } from '@/components/ui/Segmented';
import { AlertBanner } from '@/components/ui/AlertBanner';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Skeleton } from '@/components/ui/Skeleton';
import { Avatar } from '@/components/ui/Avatar';
import { SearchCombo, normalizar } from '@/components/ui/SearchCombo';
import {
  ApiError,
  Entidad,
  Prioridad,
  Tarea,
  clearSession,
  createTarea,
  deleteTarea,
  getRecordatorios,
  getUsuario,
  listEntidades,
  listTareas,
  marcarRecordatorioVisto,
  updateTarea,
  updateTareaEstado,
} from '@/lib/api';
import { diasDesde, formatFechaPartes } from '@/lib/format';

const TAKE = 20;
type Filtro = 'pendientes' | 'vencidas' | 'cumplidas' | 'todas';
type Recordatorio = Awaited<ReturnType<typeof getRecordatorios>>[number];

export default function TareasPage() {
  return (
    <Shell>
      <Suspense fallback={<p className="text-sm text-muted">Cargando…</p>}>
        <TareasPageContent />
      </Suspense>
    </Shell>
  );
}

// ---------- Fechas ----------

/** YYYY-MM-DD en hora local. */
function fechaLocal(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function partes(fecha: string): [number, number, number] {
  const [y, m, d] = fecha.split('-').map(Number);
  return [y, m, d];
}

/**
 * El vencimiento se guarda al final del día elegido (hora local): así la
 * tarea recién figura vencida cuando termina ese día, no a la medianoche
 * UTC (que en Argentina es el día anterior a las 21).
 */
function vencimientoParaApi(fecha: string): string {
  const [y, m, d] = partes(fecha);
  return new Date(y, m - 1, d, 23, 59, 59).toISOString();
}

/** El aviso aparece desde el comienzo del día: el mismo, 1 o 3 días antes. */
function avisoParaApi(fecha: string, diasAntes: number): string {
  const [y, m, d] = partes(fecha);
  return new Date(y, m - 1, d - diasAntes, 0, 0, 0).toISOString();
}

function recordatorioPendiente(t: Tarea) {
  return t.notificaciones.find((n) => n.canal === 'app' && n.estado === 'pendiente') ?? null;
}

/** Días entre el aviso y el vencimiento (0 = el mismo día). */
function diasAntesDe(t: Tarea): number | null {
  const n = recordatorioPendiente(t);
  if (!n || !t.fechaVencimiento) return null;
  const inicio = (iso: string) => new Date(new Date(iso).toDateString()).getTime();
  return Math.max(0, Math.round((inicio(t.fechaVencimiento) - inicio(n.fechaProgramada)) / 86_400_000));
}

function textoVencimiento(t: Tarea): { texto: string; tono: 'neg' | 'warn' | 'muted' } | null {
  if (!t.fechaVencimiento) return null;
  const dias = diasDesde(t.fechaVencimiento);
  if (t.estado !== 'cumplida') {
    if (t.vencida || dias > 0) {
      return { texto: dias <= 1 ? 'Venció ayer' : `Venció hace ${dias} días`, tono: 'neg' };
    }
    if (dias === 0) return { texto: 'Vence hoy', tono: 'warn' };
    if (dias === -1) return { texto: 'Vence mañana', tono: 'muted' };
  }
  const f = formatFechaPartes(t.fechaVencimiento);
  return { texto: `Vence el ${f.diaMes}`, tono: 'muted' };
}

// ---------- Pantalla ----------

function TareasPageContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const filtroParam = searchParams.get('estado');
  const filtro: Filtro =
    filtroParam === 'vencidas' || filtroParam === 'cumplidas' || filtroParam === 'todas' ? filtroParam : 'pendientes';
  const page = Math.max(1, Number(searchParams.get('page') ?? '1'));

  const [status, setStatus] = useState<'loading' | 'error' | 'ready'>('loading');
  const [result, setResult] = useState<{ data: Tarea[]; total: number }>({ data: [], total: 0 });
  const [counts, setCounts] = useState<Record<Filtro, number> | null>(null);
  const [recordatorios, setRecordatorios] = useState<Recordatorio[]>([]);
  // null = cerrado; 'nueva' = alta; una Tarea = edición. ?nueva=1 abre el
  // alta directo (acceso rápido "Nueva tarea" del Inicio).
  const [modal, setModal] = useState<'nueva' | Tarea | null>(searchParams.get('nueva') === '1' ? 'nueva' : null);

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

  const fetchList = useCallback(async () => {
    setStatus('loading');
    try {
      const res = await listTareas({
        estado: filtro === 'pendientes' ? 'pendientes' : filtro === 'cumplidas' ? 'cumplida' : undefined,
        vencidas: filtro === 'vencidas' || undefined,
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
  }, [filtro, page, router]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const fetchExtras = useCallback(async () => {
    try {
      const [todas, pendientes, vencidas, cumplidas, recs] = await Promise.all([
        listTareas({ take: 1 }),
        listTareas({ take: 1, estado: 'pendientes' }),
        listTareas({ take: 1, vencidas: true }),
        listTareas({ take: 1, estado: 'cumplida' }),
        getRecordatorios(),
      ]);
      setCounts({
        todas: todas.total,
        pendientes: pendientes.total,
        vencidas: vencidas.total,
        cumplidas: cumplidas.total,
      });
      setRecordatorios(recs);
    } catch {
      // Informativos: si fallan no bloquean el listado.
    }
  }, []);

  useEffect(() => {
    fetchExtras();
  }, [fetchExtras]);

  function refrescar() {
    fetchList();
    fetchExtras();
    avisarCambioTareas();
  }

  async function toggleCumplida(t: Tarea) {
    const nuevo = t.estado === 'cumplida' ? 'abierta' : 'cumplida';
    // Optimista: se tacha al toque; si falla, vuelve.
    setResult((r) => ({ ...r, data: r.data.map((x) => (x.id === t.id ? { ...x, estado: nuevo } : x)) }));
    try {
      await updateTareaEstado(t.id, nuevo);
      fetchExtras();
      avisarCambioTareas();
    } catch {
      setResult((r) => ({ ...r, data: r.data.map((x) => (x.id === t.id ? t : x)) }));
    }
  }

  async function marcarVisto(r: Recordatorio) {
    setRecordatorios((prev) => prev.filter((x) => x.notificacionId !== r.notificacionId));
    try {
      await marcarRecordatorioVisto(r.notificacionId);
    } catch {
      fetchExtras();
    }
  }

  function cerrarModal() {
    setModal(null);
    if (searchParams.get('nueva')) setParam('nueva', null);
  }

  const vacioPorFiltro: Record<Filtro, { titulo: string; texto: string }> = {
    pendientes: { titulo: 'No tenés nada pendiente', texto: 'Anotá lo próximo que tenés que hacer y te avisamos cuando se acerque.' },
    vencidas: { titulo: 'No hay tareas vencidas', texto: 'Estás al día con todo lo que tenía fecha.' },
    cumplidas: { titulo: 'Todavía no cumpliste ninguna', texto: 'Cuando tildes una tarea como hecha, aparece acá.' },
    todas: { titulo: 'Todavía no cargaste tareas', texto: 'Llamar a un cliente, pagar un servicio, pedir mercadería: anotalo con fecha y te avisamos.' },
  };

  return (
    <div className="max-w-4xl">
      <div className="mb-5 flex flex-col gap-4 nav:flex-row nav:items-end nav:justify-between">
        <div>
          <h1 className="font-serif text-[26px] font-semibold text-ink nav:text-[28px]">Tareas</h1>
          <p className="mt-1 text-[13.5px] text-muted">
            {counts
              ? `${counts.pendientes} ${counts.pendientes === 1 ? 'pendiente' : 'pendientes'}` +
                (counts.vencidas > 0 ? ` · ${counts.vencidas} ${counts.vencidas === 1 ? 'vencida' : 'vencidas'}` : '')
              : 'Cargando…'}
          </p>
        </div>
        <Button onClick={() => setModal('nueva')} className="gap-1.5 self-start nav:self-auto">
          <Plus className="h-4 w-4" aria-hidden />
          Nueva tarea
        </Button>
      </div>

      {recordatorios.length > 0 && (
        <section
          aria-label="Recordatorios"
          className="mb-5 rounded-xl border border-warn-soft-border bg-warn-banner px-[18px] py-3.5"
        >
          <p className="flex items-center gap-2 text-[14.5px] font-semibold text-warn-strong">
            <Bell className="h-4 w-4 text-warn" aria-hidden />
            {recordatorios.length === 1 ? 'Tenés un recordatorio' : `Tenés ${recordatorios.length} recordatorios`}
          </p>
          <ul className="mt-2 flex flex-col gap-1.5">
            {recordatorios.map((r) => (
              <li key={r.notificacionId} className="flex items-center justify-between gap-3 text-[13.5px] text-warn-on-soft">
                <button
                  type="button"
                  onClick={() => {
                    const t = result.data.find((x) => x.id === r.tareaId);
                    if (t) setModal(t);
                  }}
                  className="min-w-0 truncate text-left font-medium underline-offset-2 hover:underline"
                >
                  {r.titulo}
                </button>
                <button
                  type="button"
                  onClick={() => marcarVisto(r)}
                  className="inline-flex flex-shrink-0 items-center gap-1 rounded-lg border border-warn-soft-border bg-white px-2.5 py-1 text-[12.5px] font-semibold text-warn-on-soft hover:bg-warn-soft"
                >
                  <Check className="h-3.5 w-3.5" aria-hidden />
                  Listo
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Chip active={filtro === 'pendientes'} onClick={() => setParam('estado', null)}>
          Pendientes {counts ? counts.pendientes : ''}
        </Chip>
        <Chip active={filtro === 'vencidas'} onClick={() => setParam('estado', 'vencidas')}>
          Vencidas {counts ? counts.vencidas : ''}
        </Chip>
        <Chip active={filtro === 'cumplidas'} onClick={() => setParam('estado', 'cumplidas')}>
          Cumplidas {counts ? counts.cumplidas : ''}
        </Chip>
        <Chip active={filtro === 'todas'} onClick={() => setParam('estado', 'todas')}>
          Todas {counts ? counts.todas : ''}
        </Chip>
      </div>

      {status === 'error' && <ErrorState onRetry={fetchList} />}

      {status === 'loading' && (
        <div className="flex flex-col gap-2.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-[74px] w-full rounded-xl !bg-[#F5F0E7]" />
          ))}
        </div>
      )}

      {status === 'ready' && result.data.length === 0 && (
        <EmptyState
          icon={filtro === 'pendientes' || filtro === 'todas' ? ListTodo : Search}
          title={vacioPorFiltro[filtro].titulo}
          description={vacioPorFiltro[filtro].texto}
          action={
            filtro === 'pendientes' || filtro === 'todas' ? (
              <Button onClick={() => setModal('nueva')}>Anotar una tarea</Button>
            ) : (
              <Button variant="secondary" onClick={() => setParam('estado', null)}>
                Ver pendientes
              </Button>
            )
          }
        />
      )}

      {status === 'ready' && result.data.length > 0 && (
        <>
          <ul className="flex flex-col gap-2.5">
            {result.data.map((t) => (
              <TareaItem key={t.id} tarea={t} onToggle={() => toggleCumplida(t)} onAbrir={() => setModal(t)} />
            ))}
          </ul>

          {result.total > TAKE && (
            <div className="mt-3 flex items-center justify-between rounded-xl border border-line bg-paper-hover px-4 py-3 text-[13px] text-muted">
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
          )}
        </>
      )}

      {modal && (
        <TareaModal
          tarea={modal === 'nueva' ? null : modal}
          onClose={cerrarModal}
          onGuardada={() => {
            cerrarModal();
            refrescar();
          }}
        />
      )}
    </div>
  );
}

function TareaItem({ tarea: t, onToggle, onAbrir }: { tarea: Tarea; onToggle: () => void; onAbrir: () => void }) {
  const cumplida = t.estado === 'cumplida';
  const venc = textoVencimiento(t);
  const aviso = cumplida ? null : recordatorioPendiente(t);
  const tonoVenc =
    venc?.tono === 'neg' ? 'text-neg font-semibold' : venc?.tono === 'warn' ? 'text-warn-on-soft font-semibold' : 'text-muted';

  return (
    <li
      className={`flex items-start gap-3 rounded-xl border border-line bg-paper p-4 ${cumplida ? 'opacity-60' : ''} ${t.vencida && !cumplida ? 'border-l-4 border-l-neg' : ''}`}
    >
      <button
        type="button"
        role="checkbox"
        aria-checked={cumplida}
        aria-label={cumplida ? `Marcar "${t.titulo}" como pendiente` : `Marcar "${t.titulo}" como hecha`}
        onClick={onToggle}
        className={`mt-0.5 inline-flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md border-[1.5px] transition-colors duration-[120ms] ease-out
          ${cumplida ? 'border-verde bg-verde text-white' : 'border-input-border bg-white hover:border-verde'}`}
      >
        {cumplida && <Check className="h-4 w-4" aria-hidden />}
      </button>

      <button type="button" onClick={onAbrir} className="min-w-0 flex-1 text-left">
        <p className={`text-[15px] font-semibold text-ink ${cumplida ? 'line-through' : ''}`}>{t.titulo}</p>
        {t.descripcion && <p className="mt-0.5 line-clamp-1 text-[13px] text-ink-soft">{t.descripcion}</p>}
        <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px]">
          {cumplida && (
            <span className="inline-flex items-center gap-1 font-semibold text-verde-on-soft">
              <Check className="h-3.5 w-3.5" aria-hidden />
              Hecha
            </span>
          )}
          {!cumplida && t.estado === 'en_proceso' && (
            <span className="inline-flex items-center gap-1 font-semibold text-ink-soft">
              <Clock className="h-3.5 w-3.5" aria-hidden />
              En proceso
            </span>
          )}
          {venc && (
            <span className={`inline-flex items-center gap-1 ${tonoVenc}`}>
              {venc.tono !== 'muted' && <Clock className="h-3.5 w-3.5" aria-hidden />}
              {venc.texto}
            </span>
          )}
          {t.prioridad === 'alta' && (
            <span className="inline-flex items-center gap-0.5 font-semibold text-neg">
              <ArrowUp className="h-3.5 w-3.5" aria-hidden />
              Prioridad alta
            </span>
          )}
          {t.prioridad === 'baja' && (
            <span className="inline-flex items-center gap-0.5 text-muted">
              <ArrowDown className="h-3.5 w-3.5" aria-hidden />
              Prioridad baja
            </span>
          )}
          {aviso && (
            <span className="inline-flex items-center gap-1 text-muted">
              <Bell className="h-3.5 w-3.5" aria-hidden />
              {new Date(aviso.fechaProgramada) <= new Date(new Date().toDateString())
                ? 'Aviso activo'
                : `Aviso el ${formatFechaPartes(aviso.fechaProgramada).diaMes}`}
            </span>
          )}
          {t.entidad && <span className="text-ink-soft">{t.entidad.nombre}</span>}
        </p>
      </button>
    </li>
  );
}

// ---------- Alta / edición ----------

const AVISOS = [
  { value: 'no', label: 'No avisar' },
  { value: '0', label: 'El mismo día' },
  { value: '1', label: '1 día antes' },
  { value: '3', label: '3 días antes' },
];

function TareaModal({
  tarea,
  onClose,
  onGuardada,
}: {
  tarea: Tarea | null;
  onClose: () => void;
  onGuardada: () => void;
}) {
  const fechaInicial = tarea?.fechaVencimiento ? fechaLocal(new Date(tarea.fechaVencimiento)) : '';
  const diasIniciales = tarea ? diasAntesDe(tarea) : null;
  const avisoInicial = tarea ? (diasIniciales === null ? 'no' : String(diasIniciales)) : '0';

  const [titulo, setTitulo] = useState(tarea?.titulo ?? '');
  const [descripcion, setDescripcion] = useState(tarea?.descripcion ?? '');
  const [entidadId, setEntidadId] = useState(tarea?.entidadId ?? '');
  const [fecha, setFecha] = useState(fechaInicial);
  const [aviso, setAviso] = useState(avisoInicial);
  const [prioridad, setPrioridad] = useState<Prioridad>(tarea?.prioridad ?? 'normal');
  const [estado, setEstado] = useState<Tarea['estado']>(tarea?.estado ?? 'abierta');
  const [entidades, setEntidades] = useState<Entidad[]>(tarea?.entidad ? [tarea.entidad] : []);
  const [intento, setIntento] = useState(false);
  const [confirmarBorrar, setConfirmarBorrar] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listEntidades({ activo: true, orderBy: 'nombre', orderDir: 'asc', take: 100 })
      .then((r) => setEntidades(r.data))
      .catch(() => {});
  }, []);

  // Un aviso que no está entre las opciones (p. ej. 2 días antes, cargado
  // de otra forma) se muestra igual para no perderlo al guardar.
  const avisos =
    AVISOS.some((a) => a.value === aviso) ? AVISOS : [...AVISOS, { value: aviso, label: `${aviso} días antes` }];
  const entidad = entidades.find((e) => e.id === entidadId) ?? null;
  const errTitulo = intento && !titulo.trim() ? 'Escribí qué hay que hacer' : undefined;

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setIntento(true);
    if (!titulo.trim()) return;
    setBusy(true);
    setError(null);
    const recordatorio = fecha && aviso !== 'no' ? avisoParaApi(fecha, Number(aviso)) : null;
    try {
      if (tarea) {
        // El aviso solo se toca si cambió la fecha o la opción: si no, un
        // recordatorio ya marcado como visto volvería a aparecer.
        const cambioAviso = fecha !== fechaInicial || aviso !== avisoInicial;
        await updateTarea(tarea.id, {
          titulo: titulo.trim(),
          descripcion: descripcion.trim() || null,
          entidadId: entidadId || null,
          fechaVencimiento: fecha ? vencimientoParaApi(fecha) : null,
          prioridad,
          estado,
          recordatorio: cambioAviso ? recordatorio : undefined,
        });
      } else {
        await createTarea({
          titulo: titulo.trim(),
          descripcion: descripcion.trim() || undefined,
          entidadId: entidadId || undefined,
          fechaVencimiento: fecha ? vencimientoParaApi(fecha) : undefined,
          prioridad,
          notificaciones: recordatorio ? [{ canal: 'app', fechaProgramada: recordatorio }] : undefined,
        });
      }
      onGuardada();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Se cortó la conexión.');
      setBusy(false);
    }
  }

  async function borrar() {
    if (!tarea) return;
    setBusy(true);
    setError(null);
    try {
      await deleteTarea(tarea.id);
      onGuardada();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Se cortó la conexión.');
      setBusy(false);
    }
  }

  return (
    <Modal title={tarea ? 'Editar tarea' : 'Nueva tarea'} onClose={onClose}>
      <form onSubmit={guardar} noValidate className="flex flex-col gap-4">
        <Field label="Qué hay que hacer" htmlFor="tarea-titulo" error={errTitulo}>
          <Input
            id="tarea-titulo"
            value={titulo}
            error={!!errTitulo}
            placeholder="Llamar a Ferretería Iglesias por el pago"
            onChange={(e) => setTitulo(e.target.value)}
          />
        </Field>
        <Field label="Detalle (opcional)" htmlFor="tarea-desc">
          <textarea
            id="tarea-desc"
            rows={2}
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            className="w-full resize-y rounded-[10px] border border-input-border bg-white px-[15px] py-[12px] text-[15px] text-ink placeholder:text-placeholder focus-visible:outline-none"
          />
        </Field>
        <Field label="Con quién (opcional)" htmlFor="tarea-entidad">
          <div className="flex items-center gap-2">
            <div className="min-w-0 flex-1">
              <SearchCombo<Entidad>
                id="tarea-entidad"
                items={entidades}
                selected={entidad}
                getKey={(x) => x.id}
                getLabel={(x) => x.nombre}
                matches={(x, q) => normalizar(x.nombre).includes(q)}
                onSelect={(x) => setEntidadId(x.id)}
                placeholder="Buscá un cliente o proveedor…"
                emptyText="No hay entidades con ese nombre."
                renderOption={(x) => (
                  <div className="flex items-center gap-2.5">
                    <Avatar nombre={x.nombre} tono={x.proveedor ? 'terra' : 'verde'} />
                    <span className="truncate text-[14.5px] font-semibold text-ink">{x.nombre}</span>
                  </div>
                )}
              />
            </div>
            {entidadId && (
              <button
                type="button"
                onClick={() => setEntidadId('')}
                aria-label="Sacar la entidad"
                className="inline-flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-[10px] border border-input-border bg-white text-ink-soft hover:text-neg"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            )}
          </div>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Vence (opcional)" htmlFor="tarea-fecha">
            <Input id="tarea-fecha" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
          </Field>
          <Field label="Avisarme" htmlFor="tarea-aviso">
            <select
              id="tarea-aviso"
              value={fecha ? aviso : 'no'}
              disabled={!fecha}
              onChange={(e) => setAviso(e.target.value)}
              className="min-h-11 w-full rounded-[10px] border border-input-border bg-white px-[15px] py-[12px] text-[15px] text-ink focus-visible:outline-none disabled:cursor-not-allowed disabled:bg-canvas disabled:text-disabled-fg"
            >
              {avisos.map((a) => (
                <option key={a.value} value={a.value}>
                  {a.label}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <p className="-mt-2 text-[12px] text-muted">
          {fecha
            ? 'El aviso aparece acá en Tareas y en el Inicio. Por email o WhatsApp todavía no.'
            : 'Poné una fecha para poder elegir cuándo avisarte.'}
        </p>
        <div className="flex flex-col gap-[7px]">
          <span className="text-[13px] font-semibold text-ink-soft">Prioridad</span>
          <Segmented<Prioridad>
            label="Prioridad"
            size="sm"
            value={prioridad}
            onChange={setPrioridad}
            options={[
              { value: 'alta', label: 'Alta' },
              { value: 'normal', label: 'Normal' },
              { value: 'baja', label: 'Baja' },
            ]}
          />
        </div>
        {tarea && (
          <div className="flex flex-col gap-[7px]">
            <span className="text-[13px] font-semibold text-ink-soft">Estado</span>
            <Segmented<Tarea['estado']>
              label="Estado"
              size="sm"
              value={estado}
              onChange={setEstado}
              options={[
                { value: 'abierta', label: 'Pendiente' },
                { value: 'en_proceso', label: 'En proceso' },
                { value: 'cumplida', label: 'Hecha' },
              ]}
            />
          </div>
        )}
        {error && <AlertBanner variant="error">{error}</AlertBanner>}
        <div className="mt-1 flex flex-wrap items-center justify-between gap-2.5">
          {tarea ? (
            confirmarBorrar ? (
              <span className="flex items-center gap-2 text-[13px] text-ink-soft">
                ¿Seguro?
                <Button type="button" variant="destructive" onClick={borrar} disabled={busy}>
                  Eliminar
                </Button>
              </span>
            ) : (
              <Button type="button" variant="ghost" onClick={() => setConfirmarBorrar(true)} disabled={busy}>
                Eliminar tarea
              </Button>
            )
          ) : (
            <span />
          )}
          <div className="flex gap-2.5">
            <Button type="button" variant="ghost" onClick={onClose} disabled={busy}>
              Descartar
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? 'Guardando…' : tarea ? 'Guardar cambios' : 'Crear tarea'}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
