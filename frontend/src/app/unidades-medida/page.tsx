'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  UnidadMedida,
  ApiError,
  getUsuario,
  clearSession,
  listUnidadesMedida,
  createUnidadMedida,
  deleteUnidadMedida,
} from '@/lib/api';
import Nav from '@/components/Nav';

export default function UnidadesMedidaPage() {
  const router = useRouter();
  const [unidades, setUnidades] = useState<UnidadMedida[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [codigo, setCodigo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [creating, setCreating] = useState(false);

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      setUnidades(await listUnidadesMedida());
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
    setCreating(true);
    setError(null);
    try {
      await createUnidadMedida({ codigo, descripcion });
      setCodigo('');
      setDescripcion('');
      await refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error de conexión');
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(id: string) {
    setError(null);
    try {
      await deleteUnidadMedida(id);
      await refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error de conexión');
    }
  }

  return (
    <main className="mx-auto max-w-3xl p-6">
      <Nav />
      <h1 className="mb-6 text-xl font-semibold">Unidades de medida</h1>

      <form onSubmit={handleCreate} className="mb-8 flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-1 text-sm">
          Código (ej. KG, UN, DOC)
          <input
            required
            value={codigo}
            onChange={(e) => setCodigo(e.target.value)}
            className="rounded border px-2 py-1"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Descripción
          <input
            required
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            className="rounded border px-2 py-1"
          />
        </label>
        <button
          type="submit"
          disabled={creating}
          className="rounded bg-black px-3 py-2 text-sm text-white disabled:opacity-50"
        >
          {creating ? 'Creando…' : 'Crear unidad'}
        </button>
      </form>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      {loading ? (
        <p>Cargando…</p>
      ) : unidades.length === 0 ? (
        <p className="text-gray-500">No hay unidades de medida todavía.</p>
      ) : (
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b text-left">
              <th className="py-2">Código</th>
              <th className="py-2">Descripción</th>
              <th className="py-2"></th>
            </tr>
          </thead>
          <tbody>
            {unidades.map((u) => (
              <tr key={u.id} className="border-b">
                <td className="py-2">{u.codigo}</td>
                <td className="py-2">{u.descripcion}</td>
                <td className="py-2 text-right">
                  <button onClick={() => handleDelete(u.id)} className="underline">
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
