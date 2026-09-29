'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronRight, Pencil, Plus, Ruler, Trash2 } from 'lucide-react';
import { Shell } from '@/components/Shell';
import { Button, buttonClasses } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { AlertBanner } from '@/components/ui/AlertBanner';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Skeleton } from '@/components/ui/Skeleton';
import {
  ApiError,
  UnidadMedida,
  clearSession,
  createUnidadMedida,
  deleteUnidadMedida,
  getUsuario,
  listUnidadesMedida,
  updateUnidadMedida,
} from '@/lib/api';

// Mismo límite que el backend (CODIGO_MAX en create-unidad-medida.dto.ts).
const CODIGO_MAX = 12;

export default function UnidadesMedidaPage() {
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'error' | 'ready'>('loading');
  const [unidades, setUnidades] = useState<UnidadMedida[]>([]);
  // null = cerrado; 'nueva' = alta; una unidad = edición.
  const [editar, setEditar] = useState<'nueva' | UnidadMedida | null>(null);
  const [borrar, setBorrar] = useState<UnidadMedida | null>(null);

  const cargar = useCallback(async () => {
    setStatus('loading');
    try {
      setUnidades(await listUnidadesMedida());
      setStatus('ready');
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        clearSession();
        router.push('/login');
        return;
      }
      setStatus('error');
    }
  }, [router]);

  useEffect(() => {
    if (!getUsuario()) {
      router.push('/login');
      return;
    }
    cargar();
  }, [cargar, router]);

  function listo() {
    setEditar(null);
    setBorrar(null);
    cargar();
  }

  return (
    <Shell>
      {/* Lista corta: a todo el ancho de escritorio quedaría estirada. */}
      <div className="max-w-3xl">
        <div className="mb-5 flex flex-col gap-4 nav:flex-row nav:items-end nav:justify-between">
          <div>
            <nav aria-label="Ubicación" className="mb-1.5 flex items-center gap-1 text-[13px] text-muted">
              <Link href="/productos" className="text-muted no-underline hover:underline">
                Productos
              </Link>
              <ChevronRight className="h-3.5 w-3.5" aria-hidden />
              <span className="text-ink-soft">Unidades de medida</span>
            </nav>
            <h1 className="font-serif text-[26px] font-semibold text-ink nav:text-[28px]">Unidades de medida</h1>
            <p className="mt-1 text-[13.5px] text-muted">
              Con qué medís lo que vendés y comprás: kilos, unidades, cajas… Cada producto usa una.
            </p>
          </div>
          <Button onClick={() => setEditar('nueva')} className="gap-1.5 self-start nav:self-auto">
            <Plus className="h-4 w-4" aria-hidden />
            Nueva unidad
          </Button>
        </div>

        {status === 'error' && <ErrorState onRetry={cargar} />}

        {status === 'loading' && (
          <div className="flex flex-col gap-2.5">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-[68px] w-full rounded-xl !bg-[#F5F0E7]" />
            ))}
          </div>
        )}

        {status === 'ready' && unidades.length === 0 && (
          <EmptyState
            icon={Ruler}
            title="Todavía no cargaste unidades de medida"
            description="Cargá al menos una (por ejemplo KG, kilogramos) y ya podés dar de alta tus productos."
            action={<Button onClick={() => setEditar('nueva')}>Cargar la primera unidad</Button>}
          />
        )}

        {status === 'ready' && unidades.length > 0 && (
          <ul className="overflow-hidden rounded-xl border border-line bg-paper">
            {unidades.map((u) => {
              const usos = u._count?.productos ?? 0;
              return (
                <li
                  key={u.id}
                  className="flex items-center gap-3 border-b border-line-soft px-4 py-3.5 last:border-0 nav:px-5"
                >
                  {/* Ancho fijo: así las descripciones quedan alineadas aunque
                      el código varíe de largo ("KG" / "cajon 1.5"). */}
                  <span className="inline-flex w-[88px] flex-shrink-0 justify-center truncate rounded-lg bg-canvas px-2 py-1.5 text-[13px] font-bold text-ink-soft">
                    {u.codigo}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px] font-semibold text-ink">{u.descripcion}</p>
                    <p className="text-[12.5px] text-muted">
                      {usos === 0 ? 'Ningún producto la usa' : `La ${usos === 1 ? 'usa 1 producto' : `usan ${usos} productos`}`}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditar(u)}
                    aria-label={`Editar ${u.codigo}`}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-[10px] text-ink-soft hover:bg-canvas"
                  >
                    <Pencil className="h-4 w-4" aria-hidden />
                  </button>
                  <button
                    type="button"
                    onClick={() => setBorrar(u)}
                    aria-label={`Eliminar ${u.codigo}`}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-[10px] text-ink-soft hover:bg-neg-soft hover:text-neg"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden />
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        {editar && (
          <UnidadModal unidad={editar === 'nueva' ? null : editar} onClose={() => setEditar(null)} onGuardada={listo} />
        )}
        {borrar && <BorrarModal unidad={borrar} onClose={() => setBorrar(null)} onBorrada={listo} />}
      </div>
    </Shell>
  );
}

function UnidadModal({
  unidad,
  onClose,
  onGuardada,
}: {
  unidad: UnidadMedida | null;
  onClose: () => void;
  onGuardada: () => void;
}) {
  const [codigo, setCodigo] = useState(unidad?.codigo ?? '');
  const [descripcion, setDescripcion] = useState(unidad?.descripcion ?? '');
  const [intento, setIntento] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const errCodigo = intento && !codigo.trim() ? 'Poné un código corto, por ejemplo KG' : undefined;
  const errDescripcion = intento && !descripcion.trim() ? 'Poné qué es, por ejemplo Kilogramos' : undefined;
  const usos = unidad?._count?.productos ?? 0;
  const cambiaCodigo = !!unidad && codigo.trim() !== unidad.codigo && usos > 0;

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setIntento(true);
    if (!codigo.trim() || !descripcion.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const datos = { codigo: codigo.trim(), descripcion: descripcion.trim() };
      if (unidad) await updateUnidadMedida(unidad.id, datos);
      else await createUnidadMedida(datos);
      onGuardada();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Se cortó la conexión.');
      setBusy(false);
    }
  }

  return (
    <Modal title={unidad ? 'Editar unidad de medida' : 'Nueva unidad de medida'} onClose={onClose}>
      <form onSubmit={guardar} noValidate className="flex flex-col gap-4">
        <div className="grid grid-cols-[1fr_2fr] gap-3">
          <Field label="Código" htmlFor="um-codigo" error={errCodigo}>
            <Input
              id="um-codigo"
              value={codigo}
              maxLength={CODIGO_MAX}
              placeholder="KG"
              error={!!errCodigo}
              onChange={(e) => setCodigo(e.target.value)}
            />
          </Field>
          <Field label="Descripción" htmlFor="um-desc" error={errDescripcion}>
            <Input
              id="um-desc"
              value={descripcion}
              placeholder="Kilogramos"
              error={!!errDescripcion}
              onChange={(e) => setDescripcion(e.target.value)}
            />
          </Field>
        </div>
        <p className="text-[12.5px] text-muted">
          El código aparece al lado de cada cantidad en los remitos y el PDF (12 KG), así que conviene que sea corto.
        </p>
        {cambiaCodigo && (
          <AlertBanner variant="warn">
            Esta unidad la {usos === 1 ? 'usa 1 producto' : `usan ${usos} productos`}: el código nuevo se va a ver
            en todos, incluso en los remitos ya emitidos. Sirve para corregir un error, no para cambiar de unidad.
          </AlertBanner>
        )}
        {error && <AlertBanner variant="error">{error}</AlertBanner>}
        <div className="mt-1 flex justify-end gap-2.5">
          <Button type="button" variant="ghost" onClick={onClose} disabled={busy}>
            Descartar
          </Button>
          <Button type="submit" disabled={busy}>
            {busy ? 'Guardando…' : unidad ? 'Guardar cambios' : 'Crear unidad'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function BorrarModal({
  unidad,
  onClose,
  onBorrada,
}: {
  unidad: UnidadMedida;
  onClose: () => void;
  onBorrada: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const usos = unidad._count?.productos ?? 0;

  async function borrar() {
    setBusy(true);
    setError(null);
    try {
      await deleteUnidadMedida(unidad.id);
      onBorrada();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Se cortó la conexión.');
      setBusy(false);
    }
  }

  return (
    <Modal title={`¿Eliminar ${unidad.codigo}?`} onClose={() => !busy && onClose()}>
      <div className="flex flex-col gap-4">
        {usos > 0 ? (
          <>
            <p className="text-[14.5px] text-ink-soft">
              No se puede eliminar: la {usos === 1 ? 'usa 1 producto' : `usan ${usos} productos`} (contando los
              dados de baja). Si ya no la usás, cambiales la unidad a esos productos primero.
            </p>
            <div className="flex justify-end gap-2.5">
              <Button variant="ghost" onClick={onClose}>
                Volver
              </Button>
              <Link href="/productos?estado=todos" className={buttonClasses('secondary')}>
                Ver productos
              </Link>
            </div>
          </>
        ) : (
          <>
            <p className="text-[14.5px] text-ink-soft">
              Se borra <strong className="text-ink">{unidad.codigo}</strong> ({unidad.descripcion}). Ningún producto
              la usa, así que no afecta nada más.
            </p>
            {error && <AlertBanner variant="error">{error}</AlertBanner>}
            <div className="flex justify-end gap-2.5">
              <Button variant="ghost" onClick={onClose} disabled={busy}>
                Volver
              </Button>
              <Button variant="destructive" onClick={borrar} disabled={busy}>
                {busy ? 'Eliminando…' : 'Eliminar'}
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
