'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Pago,
  Obligacion,
  Entidad,
  ApiError,
  getUsuario,
  clearSession,
  listPagos,
  listObligaciones,
  listEntidades,
  createPago,
  anularPago,
} from '@/lib/api';
import Nav from '@/components/Nav';

interface AplicacionForm {
  obligacionId: string;
  monto: string;
}

export default function PagosPage() {
  const router = useRouter();
  const [pagos, setPagos] = useState<Pago[]>([]);
  const [obligaciones, setObligaciones] = useState<Obligacion[]>([]);
  const [entidades, setEntidades] = useState<Entidad[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [entidadId, setEntidadId] = useState('');
  const [monto, setMonto] = useState('');
  const [medio, setMedio] = useState('');
  const [aplicaciones, setAplicaciones] = useState<AplicacionForm[]>([]);

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const [pagosRes, obligacionesRes, entidadesRes] = await Promise.all([
        listPagos(),
        listObligaciones(),
        listEntidades(),
      ]);
      setPagos(pagosRes.data);
      setObligaciones(
        obligacionesRes.data.filter((o) => o.saldo > 0 && o.estado !== 'anulada'),
      );
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

  function agregarAplicacion() {
    setAplicaciones((prev) => [...prev, { obligacionId: '', monto: '' }]);
  }

  function updateAplicacion(index: number, patch: Partial<AplicacionForm>) {
    setAplicaciones((prev) => prev.map((a, i) => (i === index ? { ...a, ...patch } : a)));
  }

  function quitarAplicacion(index: number) {
    setAplicaciones((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await createPago({
        entidadId: entidadId || undefined,
        monto: Number(monto),
        medio: medio || undefined,
        aplicaciones: aplicaciones
          .filter((a) => a.obligacionId)
          .map((a) => ({ obligacionId: a.obligacionId, monto: Number(a.monto) })),
      });
      setEntidadId('');
      setMonto('');
      setMedio('');
      setAplicaciones([]);
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
      await anularPago(id);
      await refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error de conexión');
    }
  }

  return (
    <main className="mx-auto max-w-4xl p-6">
      <Nav />
      <h1 className="mb-6 text-xl font-semibold">Pagos</h1>

      <form onSubmit={handleCreate} className="mb-8 flex flex-col gap-3">
        <div className="flex flex-wrap items-end gap-2">
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
          <label className="flex flex-col gap-1 text-sm">
            Monto total
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
            Medio
            <input
              value={medio}
              onChange={(e) => setMedio(e.target.value)}
              className="rounded border px-2 py-1"
            />
          </label>
        </div>

        <div>
          <h2 className="mb-1 text-sm font-medium">
            Aplicar a obligaciones (opcional -- si no se aplica a nada, el pago queda suelto)
          </h2>
          {aplicaciones.map((a, i) => (
            <div key={i} className="mb-1 flex items-end gap-2">
              <select
                value={a.obligacionId}
                onChange={(e) => updateAplicacion(i, { obligacionId: e.target.value })}
                className="rounded border px-2 py-1 text-sm"
              >
                <option value="">elegir obligación…</option>
                {obligaciones.map((o) => (
                  <option key={o.id} value={o.id}>
                    {(o.entidad?.nombre ?? 'sin entidad')} — {o.descripcion ?? o.tipo ?? o.id.slice(0, 8)} (saldo:{' '}
                    {o.saldo})
                  </option>
                ))}
              </select>
              <input
                type="number"
                step="0.01"
                min="0.01"
                placeholder="monto"
                value={a.monto}
                onChange={(e) => updateAplicacion(i, { monto: e.target.value })}
                className="w-28 rounded border px-2 py-1 text-sm"
              />
              <button type="button" onClick={() => quitarAplicacion(i)} className="text-sm underline">
                quitar
              </button>
            </div>
          ))}
          <button type="button" onClick={agregarAplicacion} className="text-sm underline">
            + aplicar a una obligación
          </button>
        </div>

        <button
          type="submit"
          disabled={busy}
          className="w-fit rounded bg-black px-3 py-2 text-sm text-white disabled:opacity-50"
        >
          {busy ? 'Creando…' : 'Crear pago'}
        </button>
      </form>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      {loading ? (
        <p>Cargando…</p>
      ) : pagos.length === 0 ? (
        <p className="text-gray-500">No hay pagos todavía.</p>
      ) : (
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b text-left">
              <th className="py-2">Entidad</th>
              <th className="py-2">Monto</th>
              <th className="py-2">Medio</th>
              <th className="py-2">Aplicado a</th>
              <th className="py-2">Estado</th>
              <th className="py-2"></th>
            </tr>
          </thead>
          <tbody>
            {pagos.map((p) => (
              <tr key={p.id} className="border-b">
                <td className="py-2">{p.entidad?.nombre ?? '—'}</td>
                <td className="py-2">{p.monto}</td>
                <td className="py-2">{p.medio ?? '—'}</td>
                <td className="py-2">
                  {p.aplicaciones.length === 0
                    ? '—'
                    : p.aplicaciones
                        .map((a) => a.obligacion?.descripcion ?? a.obligacion?.tipo ?? a.obligacionId.slice(0, 8))
                        .join(', ')}
                </td>
                <td className="py-2">{p.estado}</td>
                <td className="py-2 text-right">
                  {p.estado !== 'rechazado' && (
                    <button onClick={() => handleAnular(p.id)} className="underline">
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
