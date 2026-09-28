'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Remito,
  Producto,
  ApiError,
  getUsuario,
  clearSession,
  getRemito,
  listProductos,
  updateRemitoDetalles,
  emitirRemito,
  anularRemito,
  downloadRemitoPdf,
} from '@/lib/api';
import Nav from '@/components/Nav';

interface LineaForm {
  productoId: string;
  cantidad: string;
  precioUnitario: string;
}

export default function RemitoDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [remito, setRemito] = useState<Remito | null>(null);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [lineas, setLineas] = useState<LineaForm[]>([]);

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const [remitoRes, productosRes] = await Promise.all([
        getRemito(id),
        listProductos(),
      ]);
      setRemito(remitoRes);
      setProductos(productosRes.data.filter((p) => p.activo));
      setLineas(
        remitoRes.detalles.map((d) => ({
          productoId: d.productoId,
          cantidad: d.cantidad,
          precioUnitario: d.precioUnitario,
        })),
      );
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
  }, [id]);

  function updateLinea(index: number, patch: Partial<LineaForm>) {
    setLineas((prev) => prev.map((l, i) => (i === index ? { ...l, ...patch } : l)));
  }

  function agregarLinea() {
    setLineas((prev) => [...prev, { productoId: '', cantidad: '1', precioUnitario: '' }]);
  }

  function quitarLinea(index: number) {
    setLineas((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleGuardar() {
    setBusy(true);
    setError(null);
    try {
      await updateRemitoDetalles(
        id,
        lineas.map((l) => ({
          productoId: l.productoId,
          cantidad: Number(l.cantidad),
          precioUnitario: Number(l.precioUnitario),
        })),
      );
      await refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error de conexión');
    } finally {
      setBusy(false);
    }
  }

  async function handleEmitir() {
    setBusy(true);
    setError(null);
    try {
      await emitirRemito(id);
      await refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error de conexión');
    } finally {
      setBusy(false);
    }
  }

  async function handleAnular() {
    setBusy(true);
    setError(null);
    try {
      await anularRemito(id);
      await refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error de conexión');
    } finally {
      setBusy(false);
    }
  }

  async function handleDescargarPdf() {
    setError(null);
    try {
      await downloadRemitoPdf(id, `remito-${remito?.numero ?? id.slice(0, 8)}.pdf`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error de conexión');
    }
  }

  if (loading || !remito) {
    return (
      <main className="mx-auto max-w-3xl p-6">
        <Nav />
        <p>Cargando…</p>
      </main>
    );
  }

  const esBorrador = remito.estado === 'borrador';
  const total = lineas.reduce(
    (acc, l) => acc + Number(l.cantidad || 0) * Number(l.precioUnitario || 0),
    0,
  );

  return (
    <main className="mx-auto max-w-3xl p-6">
      <Nav />
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold">
          Remito {remito.numero ?? remito.id.slice(0, 8)}
        </h1>
        <div className="flex items-center gap-3">
          <button onClick={handleDescargarPdf} className="text-sm underline">
            Descargar PDF
          </button>
          <span className="rounded border px-2 py-1 text-sm">{remito.estado}</span>
        </div>
      </div>

      <dl className="mb-6 grid grid-cols-2 gap-2 text-sm">
        <dt className="text-gray-500">Tipo</dt>
        <dd>{remito.tipo === 'E' ? 'Entrada' : 'Salida'}</dd>
        <dt className="text-gray-500">Fecha</dt>
        <dd>{new Date(remito.fecha).toLocaleString()}</dd>
        <dt className="text-gray-500">Entidad</dt>
        <dd>{remito.entidad?.nombre ?? '—'}</dd>
        {remito.obligacionGenerada && remito.obligacionGenerada.estado !== 'anulada' && (
          <>
            <dt className="text-gray-500">Cuenta corriente</dt>
            <dd>
              {remito.obligacionGenerada.direccion === 'a_pagar'
                ? 'Generó una deuda nuestra con la entidad'
                : 'Generó una deuda de la entidad hacia nosotros'}{' '}
              (
              {remito.entidadId && (
                <Link
                  href={`/cuentas/corrientes/${remito.entidadId}`}
                  className="underline"
                >
                  ver cuenta corriente
                </Link>
              )}
              )
            </dd>
          </>
        )}
      </dl>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      <h2 className="mb-2 text-sm font-medium">Detalle</h2>
      <div className="mb-4 flex flex-col gap-2">
        {lineas.map((linea, i) =>
          esBorrador ? (
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
          ) : (
            <div key={i} className="flex gap-4 text-sm">
              <span>{remito.detalles[i]?.producto.nombre}</span>
              <span>{linea.cantidad}</span>
              <span>{linea.precioUnitario}</span>
              <span>{remito.detalles[i]?.subtotal}</span>
            </div>
          ),
        )}
      </div>

      {esBorrador && (
        <div className="mb-4 flex items-center gap-3">
          <button type="button" onClick={agregarLinea} className="text-sm underline">
            + agregar línea
          </button>
          <button
            type="button"
            onClick={handleGuardar}
            disabled={busy}
            className="rounded border px-3 py-1 text-sm disabled:opacity-50"
          >
            Guardar cambios
          </button>
        </div>
      )}

      <p className="mb-6 text-sm font-medium">Total: {total.toFixed(2)}</p>

      <div className="flex gap-3">
        {esBorrador && (
          <button
            onClick={handleEmitir}
            disabled={busy}
            className="rounded bg-black px-3 py-2 text-sm text-white disabled:opacity-50"
          >
            Emitir
          </button>
        )}
        {(remito.estado === 'borrador' || remito.estado === 'emitido') && (
          <button
            onClick={handleAnular}
            disabled={busy}
            className="rounded border px-3 py-2 text-sm disabled:opacity-50"
          >
            Anular
          </button>
        )}
      </div>
    </main>
  );
}
