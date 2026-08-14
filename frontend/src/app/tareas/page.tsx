'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Tarea,
  ApiError,
  getUsuario,
  clearSession,
  listTareas,
  getRecordatorios,
  createTarea,
  updateTareaEstado,
  deleteTarea,
} from '@/lib/api';
import Nav from '@/components/Nav';

export default function TareasPage() {
  const router = useRouter();
  const [tareas, setTareas] = useState<Tarea[]>([]);
  const [recordatorios, setRecordatorios] = useState<
    { notificacionId: string; tareaId: string; titulo: string; fechaProgramada: string }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [fechaVencimiento, setFechaVencimiento] = useState('');

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const [tareasRes, recordatoriosRes] = await Promise.all([
        listTareas(),
        getRecordatorios(),
      ]);
      setTareas(tareasRes.data);
      setRecordatorios(recordatoriosRes);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        clearSession();
        router.push('/login');
        return;
      }
      setError(err instanceof ApiError ? err.message : 'Error de conexión');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!getUsuario()) {
      router.push('/login');
      return;
    }
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await createTarea({
        titulo,
        descripcion: descripcion || undefined,
        fechaVencimiento: fechaVencimiento || undefined,
        notificaciones: fechaVencimiento
          ? [{ canal: 'app', fechaProgramada: fechaVencimiento }]
          : undefined,
      });
      setTitulo('');
      setDescripcion('');
      setFechaVencimiento('');
      await refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error de conexión');
    } finally {
      setBusy(false);
    }
  }

  async function handleEstado(id: string, estado: 'abierta' | 'en_proceso' | 'cumplida') {
    setError(null);
    try {
      await updateTareaEstado(id, estado);
      await refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error de conexión');
    }
  }

  async function handleDelete(id: string) {
    setError(null);
    try {
      await deleteTarea(id);
      await refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error de conexión');
    }
  }

  return (
    <main className="mx-auto max-w-3xl p-6">
      <Nav />
      <h1 className="mb-4 text-xl font-semibold">Tareas</h1>

      {recordatorios.length > 0 && (
        <div className="mb-6 rounded border border-amber-400 bg-amber-50 p-3 text-sm">
          <strong>Recordatorios pendientes:</strong>
          <ul className="ml-4 list-disc">
            {recordatorios.map((r) => (
              <li key={r.notificacionId}>{r.titulo}</li>
            ))}
          </ul>
        </div>
      )}

      <form onSubmit={handleCreate} className="mb-8 flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-1 text-sm">
          Título
          <input
            required
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            className="rounded border px-2 py-1"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Descripción
          <input
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            className="rounded border px-2 py-1"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Vencimiento (opcional -- si se pone, arma un recordatorio "app")
          <input
            type="date"
            value={fechaVencimiento}
            onChange={(e) => setFechaVencimiento(e.target.value)}
            className="rounded border px-2 py-1"
          />
        </label>
        <button
          type="submit"
          disabled={busy}
          className="rounded bg-black px-3 py-2 text-sm text-white disabled:opacity-50"
        >
          {busy ? 'Creando…' : 'Crear tarea'}
        </button>
      </form>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      {loading ? (
        <p>Cargando…</p>
      ) : tareas.length === 0 ? (
        <p className="text-gray-500">No hay tareas todavía.</p>
      ) : (
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b text-left">
              <th className="py-2">Título</th>
              <th className="py-2">Vencimiento</th>
              <th className="py-2">Estado</th>
              <th className="py-2"></th>
            </tr>
          </thead>
          <tbody>
            {tareas.map((t) => (
              <tr key={t.id} className="border-b">
                <td className="py-2">{t.titulo}</td>
                <td className="py-2">
                  {t.fechaVencimiento ? new Date(t.fechaVencimiento).toLocaleDateString() : '—'}
                  {t.vencida && <span className="ml-1 text-red-600">(vencida)</span>}
                </td>
                <td className="py-2">
                  <select
                    value={t.estado}
                    onChange={(e) =>
                      handleEstado(t.id, e.target.value as 'abierta' | 'en_proceso' | 'cumplida')
                    }
                    className="rounded border px-1 py-0.5"
                  >
                    <option value="abierta">abierta</option>
                    <option value="en_proceso">en proceso</option>
                    <option value="cumplida">cumplida</option>
                  </select>
                </td>
                <td className="py-2 text-right">
                  <button onClick={() => handleDelete(t.id)} className="underline">
                    eliminar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
