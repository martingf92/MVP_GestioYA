'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Entidad,
  Producto,
  ApiError,
  getUsuario,
  clearSession,
  listEntidades,
  listProductos,
  createRemito,
} from '@/lib/api';
import Nav from '@/components/Nav';

interface LineaForm {
  productoId: string;
  cantidad: string;
  precioUnitario: string;
}

function lineaVacia(): LineaForm {
  return { productoId: '', cantidad: '1', precioUnitario: '' };
}

export default function NuevoRemitoPage() {
  const router = useRouter();
  const [entidades, setEntidades] = useState<Entidad[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [tipo, setTipo] = useState<'E' | 'S'>('S');
  const [entidadId, setEntidadId] = useState('');
  const [lineas, setLineas] = useState<LineaForm[]>([lineaVacia()]);

  useEffect(() => {
    if (!getUsuario()) {
      router.push('/login');
      return;
    }
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [entidadesRes, productosRes] = await Promise.all([
          listEntidades(),
          listProductos(),
        ]);
        setEntidades(entidadesRes.data.filter((e) => e.activo));
        setProductos(productosRes.data.filter((p) => p.activo));
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
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function updateLinea(index: number, patch: Partial<LineaForm>) {
    setLineas((prev) => prev.map((l, i) => (i === index ? { ...l, ...patch } : l)));
  }

  function agregarLinea() {
    setLineas((prev) => [...prev, lineaVacia()]);
  }

  function quitarLinea(index: number) {
    setLineas((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const remito = await createRemito({
        tipo,
        entidadId: entidadId || undefined,
        detalles: lineas.map((l) => ({
          productoId: l.productoId,
          cantidad: Number(l.cantidad),
          precioUnitario: Number(l.precioUnitario),
        })),
      });
      router.push(`/remitos/${remito.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error de conexión');
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="mx-auto max-w-3xl p-6">
        <Nav />
        <p>Cargando…</p>
      </main>
    );
  }

  if (productos.length === 0) {
    return (
      <main className="mx-auto max-w-3xl p-6">
        <Nav />
        <p className="text-sm text-gray-500">
          Necesitás al menos un producto activo para crear un remito. Cargá uno en
          Productos primero.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl p-6">
      <Nav />
      <h1 className="mb-6 text-xl font-semibold">Nuevo remito</h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex gap-4">
          <label className="flex flex-col gap-1 text-sm">
            Tipo
            <select
              value={tipo}
              onChange={(e) => setTipo(e.target.value as 'E' | 'S')}
              className="rounded border px-2 py-1"
            >
              <option value="S">Salida</option>
              <option value="E">Entrada</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Entidad (opcional)
            <select
              value={entidadId}
              onChange={(e) => setEntidadId(e.target.value)}
              className="rounded border px-2 py-1"
            >
              <option value="">—</option>
              {entidades.map((ent) => (
                <option key={ent.id} value={ent.id}>
                  {ent.nombre}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div>
          <h2 className="mb-2 text-sm font-medium">Detalle</h2>
          <div className="flex flex-col gap-2">
            {lineas.map((linea, i) => (
              <div key={i} className="flex items-end gap-2">
                <label className="flex flex-col gap-1 text-sm">
                  Producto
                  <select
                    required
                    value={linea.productoId}
                    onChange={(e) => updateLinea(i, { productoId: e.target.value })}
                    className="rounded border px-2 py-1"
                  >
                    <option value="" disabled>
                      elegir…
                    </option>
                    {productos.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nombre}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  Cantidad
                  <input
                    required
                    type="number"
                    step="0.001"
                    min="0.001"
                    value={linea.cantidad}
                    onChange={(e) => updateLinea(i, { cantidad: e.target.value })}
                    className="w-24 rounded border px-2 py-1"
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  Precio unitario
                  <input
                    required
                    type="number"
                    step="0.01"
                    min="0"
                    value={linea.precioUnitario}
                    onChange={(e) => updateLinea(i, { precioUnitario: e.target.value })}
                    className="w-28 rounded border px-2 py-1"
                  />
                </label>
                {lineas.length > 1 && (
                  <button
                    type="button"
                    onClick={() => quitarLinea(i)}
                    className="mb-1 underline"
                  >
                    quitar
                  </button>
                )}
              </div>
            ))}
          </div>
          <button type="button" onClick={agregarLinea} className="mt-2 text-sm underline">
            + agregar línea
          </button>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={saving}
          className="w-fit rounded bg-black px-3 py-2 text-sm text-white disabled:opacity-50"
        >
          {saving ? 'Creando…' : 'Crear remito'}
        </button>
      </form>
    </main>
  );
}
