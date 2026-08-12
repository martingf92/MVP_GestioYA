'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Producto,
  UnidadMedida,
  ApiError,
  getUsuario,
  clearSession,
  listProductos,
  listUnidadesMedida,
  createProducto,
  deleteProducto,
} from '@/lib/api';
import Nav from '@/components/Nav';

export default function ProductosPage() {
  const router = useRouter();
  const [productos, setProductos] = useState<Producto[]>([]);
  const [unidades, setUnidades] = useState<UnidadMedida[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nombre, setNombre] = useState('');
  const [sku, setSku] = useState('');
  const [unidadMedidaId, setUnidadMedidaId] = useState('');
  const [precioUnitario, setPrecioUnitario] = useState('');
  const [creating, setCreating] = useState(false);

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const [productosRes, unidadesRes] = await Promise.all([
        listProductos(),
        listUnidadesMedida(),
      ]);
      setProductos(productosRes.data);
      setUnidades(unidadesRes);
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
      await createProducto({
        nombre,
        sku: sku || undefined,
        unidadMedidaId,
        precioUnitario: precioUnitario ? Number(precioUnitario) : undefined,
      });
      setNombre('');
      setSku('');
      setPrecioUnitario('');
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
      await deleteProducto(id);
      await refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error de conexión');
    }
  }

  return (
    <main className="mx-auto max-w-3xl p-6">
      <Nav />
      <h1 className="mb-6 text-xl font-semibold">Productos</h1>

      {!loading && unidades.length === 0 ? (
        <p className="mb-6 text-sm text-gray-500">
          Todavía no hay unidades de medida cargadas. Creá al menos una en{' '}
          <Link href="/unidades-medida" className="underline">
            Unidades de medida
          </Link>{' '}
          antes de dar de alta un producto.
        </p>
      ) : (
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
            SKU (opcional)
            <input
              value={sku}
              onChange={(e) => setSku(e.target.value)}
              className="rounded border px-2 py-1"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Unidad de medida
            <select
              required
              value={unidadMedidaId}
              onChange={(e) => setUnidadMedidaId(e.target.value)}
              className="rounded border px-2 py-1"
            >
              <option value="" disabled>
                elegir…
              </option>
              {unidades.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.codigo}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Precio (opcional)
            <input
              type="number"
              step="0.01"
              value={precioUnitario}
              onChange={(e) => setPrecioUnitario(e.target.value)}
              className="w-28 rounded border px-2 py-1"
            />
          </label>
          <button
            type="submit"
            disabled={creating}
            className="rounded bg-black px-3 py-2 text-sm text-white disabled:opacity-50"
          >
            {creating ? 'Creando…' : 'Crear producto'}
          </button>
        </form>
      )}

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      {loading ? (
        <p>Cargando…</p>
      ) : productos.length === 0 ? (
        <p className="text-gray-500">No hay productos todavía.</p>
      ) : (
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b text-left">
              <th className="py-2">Nombre</th>
              <th className="py-2">SKU</th>
              <th className="py-2">Unidad</th>
              <th className="py-2">Precio</th>
              <th className="py-2">Activo</th>
              <th className="py-2"></th>
            </tr>
          </thead>
          <tbody>
            {productos.map((p) => (
              <tr key={p.id} className="border-b">
                <td className="py-2">{p.nombre}</td>
                <td className="py-2">{p.sku ?? '—'}</td>
                <td className="py-2">{p.unidadMedida?.codigo ?? '—'}</td>
                <td className="py-2">{p.precioUnitario}</td>
                <td className="py-2">{p.activo ? 'sí' : 'no'}</td>
                <td className="py-2 text-right">
                  {p.activo && (
                    <button onClick={() => handleDelete(p.id)} className="underline">
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
