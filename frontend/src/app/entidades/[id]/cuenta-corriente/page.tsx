'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CuentaCorriente, ApiError, getUsuario, clearSession, getCuentaCorriente } from '@/lib/api';
import Nav from '@/components/Nav';

export default function CuentaCorrientePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [cuenta, setCuenta] = useState<CuentaCorriente | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!getUsuario()) {
      router.push('/login');
      return;
    }
    (async () => {
      setLoading(true);
      setError(null);
      try {
        setCuenta(await getCuentaCorriente(id));
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
  }, [id]);

  return (
    <main className="mx-auto max-w-3xl p-6">
      <Nav />
      <h1 className="mb-6 text-xl font-semibold">Cuenta corriente</h1>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      {loading || !cuenta ? (
        <p>Cargando…</p>
      ) : (
        <>
          <p className="mb-6 text-lg">
            Saldo actual: <strong>{cuenta.saldoActual}</strong> {cuenta.moneda ?? 'ARS'}
            <span className="ml-2 text-sm text-gray-500">
              ({Number(cuenta.saldoActual) >= 0 ? 'la entidad nos debe' : 'le debemos a la entidad'})
            </span>
          </p>

          <h2 className="mb-2 text-sm font-medium">Movimientos</h2>
          {cuenta.movimientos.length === 0 ? (
            <p className="text-gray-500">Sin movimientos todavía.</p>
          ) : (
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="py-2">Fecha</th>
                  <th className="py-2">Tipo</th>
                  <th className="py-2">Concepto</th>
                  <th className="py-2">Monto</th>
                  <th className="py-2">Saldo resultante</th>
                </tr>
              </thead>
              <tbody>
                {cuenta.movimientos.map((m) => (
                  <tr key={m.id} className="border-b">
                    <td className="py-2">{new Date(m.fecha).toLocaleString()}</td>
                    <td className="py-2">{m.tipo}</td>
                    <td className="py-2">{m.concepto ?? '—'}</td>
                    <td className="py-2">{m.monto}</td>
                    <td className="py-2">{m.saldoResultante}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}
    </main>
  );
}
