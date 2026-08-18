'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Obligacion,
  Entidad,
  ApiError,
  getUsuario,
  clearSession,
  listObligaciones,
  listEntidades,
  createObligacion,
  anularObligacion,
} from '@/lib/api';
import Nav from '@/components/Nav';

export default function ObligacionesPage() {
  const router = useRouter();
  const [obligaciones, setObligaciones] = useState<Obligacion[]>([]);
  const [entidades, setEntidades] = useState<Entidad[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [entidadId, setEntidadId] = useState('');
  const [monto, setMonto] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [fechaVencimiento, setFechaVencimiento] = useState('');
  const [direccion, setDireccion] = useState<'a_cobrar' | 'a_pagar'>('a_cobrar');

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const [obligacionesRes, entidadesRes] = await Promise.all([
        listObligaciones(),
        listEntidades(),
      ]);
      setObligaciones(obligacionesRes.data);
      setEntidades(entidadesRes.data.filter((e) => e.activo));
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
      await createObligacion({
        entidadId: entidadId || undefined,
        monto: Number(monto),
        descripcion: descripcion || undefined,
        fechaVencimiento: fechaVencimiento || undefined,
        direccion,
      });
      setEntidadId('');
      setMonto('');
      setDescripcion('');
      setFechaVencimiento('');
      setDireccion('a_cobrar');
      await refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error de conexión');
    } finally {
      setBusy(false);
    }
  }

  async function handleAnular(id: string) {
    setError(null);
    try {
      await anularObligacion(id);
      await refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error de conexión');
    }
  }

  return (
    <main className="mx-auto max-w-4xl p-6">
      <Nav />
      <h1 className="mb-6 text-xl font-semibold">Obligaciones</h1>

      <form onSubmit={handleCreate} className="mb-8 flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-1 text-sm">
          Entidad (opcional -- vacío = gasto general de la empresa)
          <select
            value={entidadId}
            onChange={(e) => setEntidadId(e.target.value)}
            className="rounded border px-2 py-1"
          >
            <option value="">— sin entidad —</option>
            {entidades.map((ent) => (
              <option key={ent.id} value={ent.id}>
                {ent.nombre}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Dirección
          <select
            value={direccion}
            onChange={(e) => setDireccion(e.target.value as 'a_cobrar' | 'a_pagar')}
            className="rounded border px-2 py-1"
          >
            <option value="a_cobrar">Nos deben (a cobrar)</option>
            <option value="a_pagar">Les debemos (a pagar)</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Monto
          <input
            required
            type="number"
            step="0.01"
            min="0.01"
            value={monto}
            onChange={(e) => setMonto(e.target.value)}
            className="w-28 rounded border px-2 py-1"
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
          Vencimiento (opcional)
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
          {busy ? 'Creando…' : 'Crear obligación'}
        </button>
      </form>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      {loading ? (
        <p>Cargando…</p>
      ) : obligaciones.length === 0 ? (
        <p className="text-gray-500">No hay obligaciones todavía.</p>
      ) : (
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b text-left">
              <th className="py-2">Entidad</th>
              <th className="py-2">Descripción</th>
              <th className="py-2">Dirección</th>
              <th className="py-2">Monto</th>
              <th className="py-2">Pagado</th>
              <th className="py-2">Estado</th>
              <th className="py-2"></th>
            </tr>
          </thead>
          <tbody>
            {obligaciones.map((o) => (
              <tr key={o.id} className="border-b">
                <td className="py-2">{o.entidad?.nombre ?? '— (gasto general)'}</td>
                <td className="py-2">{o.descripcion ?? o.tipo ?? '—'}</td>
                <td className="py-2 text-xs">
                  {o.direccion === 'a_pagar' ? 'les debemos' : 'nos deben'}
                </td>
                <td className="py-2">{o.monto}</td>
                <td className="py-2">{o.montoPagado}</td>
                <td className="py-2">
                  {o.estado}
                  {o.vencida && <span className="ml-1 text-red-600">(vencida)</span>}
                </td>
                <td className="py-2 text-right">
                  {o.estado !== 'anulada' && o.montoPagado === 0 && (
                    <button onClick={() => handleAnular(o.id)} className="underline">
                      anular
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
