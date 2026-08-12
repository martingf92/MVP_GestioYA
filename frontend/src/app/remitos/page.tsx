'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Remito, ApiError, getUsuario, clearSession, listRemitos } from '@/lib/api';
import Nav from '@/components/Nav';

export default function RemitosPage() {
  const router = useRouter();
  const [remitos, setRemitos] = useState<Remito[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const res = await listRemitos();
      setRemitos(res.data);
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

  return (
    <main className="mx-auto max-w-3xl p-6">
      <Nav />
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Remitos</h1>
        <Link
          href="/remitos/nuevo"
          className="rounded bg-black px-3 py-2 text-sm text-white"
        >
          Nuevo remito
        </Link>
      </div>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      {loading ? (
        <p>Cargando…</p>
      ) : remitos.length === 0 ? (
        <p className="text-gray-500">No hay remitos todavía.</p>
      ) : (
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b text-left">
              <th className="py-2">Número</th>
              <th className="py-2">Tipo</th>
              <th className="py-2">Fecha</th>
              <th className="py-2">Entidad</th>
              <th className="py-2">Estado</th>
            </tr>
          </thead>
          <tbody>
            {remitos.map((r) => (
              <tr key={r.id} className="border-b">
                <td className="py-2">
                  <Link href={`/remitos/${r.id}`} className="underline">
                    {r.numero ?? r.id.slice(0, 8)}
                  </Link>
                </td>
                <td className="py-2">{r.tipo === 'E' ? 'Entrada' : 'Salida'}</td>
                <td className="py-2">{new Date(r.fecha).toLocaleDateString()}</td>
                <td className="py-2">{r.entidad?.nombre ?? '—'}</td>
                <td className="py-2">{r.estado}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
