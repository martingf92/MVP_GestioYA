'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Entidad,
  ApiError,
  getUsuario,
  clearSession,
  listEntidades,
  createEntidad,
  deleteEntidad,
} from '@/lib/api';

export default function EntidadesPage() {
  const router = useRouter();
  const [entidades, setEntidades] = useState<Entidad[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nombre, setNombre] = useState('');
  const [documentoNro, setDocumentoNro] = useState('');
  const [creating, setCreating] = useState(false);

  const usuario = getUsuario();

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const res = await listEntidades();
      setEntidades(res.data);
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
      await createEntidad({
        nombre,
        documentoNro: documentoNro || undefined,
      });
      setNombre('');
      setDocumentoNro('');
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
      await deleteEntidad(id);
      await refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error de conexión');
    }
  }

  function handleLogout() {
    clearSession();
    router.push('/login');
  }

  return (
    <main className="mx-auto max-w-3xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Entidades</h1>
        <div className="text-sm text-gray-500">
          {usuario?.email}{' '}
          <button onClick={handleLogout} className="ml-2 underline">
            salir
          </button>
        </div>
      </div>

      <form onSubmit={handleCreate} className="mb-8 flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-1 text-sm">
          Nombre
          <input
            required
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            className="rounded border px-2 py-1"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Documento (opcional)
          <input
            value={documentoNro}
            onChange={(e) => setDocumentoNro(e.target.value)}
            className="rounded border px-2 py-1"
          />
        </label>
        <button
          type="submit"
          disabled={creating}
          className="rounded bg-black px-3 py-2 text-sm text-white disabled:opacity-50"
        >
          {creating ? 'Creando…' : 'Crear entidad'}
        </button>
      </form>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      {loading ? (
        <p>Cargando…</p>
      ) : entidades.length === 0 ? (
        <p className="text-gray-500">No hay entidades todavía.</p>
      ) : (
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b text-left">
              <th className="py-2">Nombre</th>
              <th className="py-2">Documento</th>
              <th className="py-2">Activo</th>
              <th className="py-2"></th>
            </tr>
          </thead>
          <tbody>
            {entidades.map((e) => (
              <tr key={e.id} className="border-b">
                <td className="py-2">{e.nombre}</td>
                <td className="py-2">{e.documentoNro ?? '—'}</td>
                <td className="py-2">{e.activo ? 'sí' : 'no'}</td>
                <td className="py-2 text-right">
                  {e.activo && (
                    <button onClick={() => handleDelete(e.id)} className="underline">
                      dar de baja
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
