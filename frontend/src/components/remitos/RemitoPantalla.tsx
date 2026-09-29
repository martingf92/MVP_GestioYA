'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shell } from '@/components/Shell';
import { ErrorState } from '@/components/ui/ErrorState';
import { RemitoEditor } from './RemitoEditor';
import { RemitoDetalle } from './RemitoDetalle';
import { ApiError, Remito, clearSession, getRemito, getUsuario } from '@/lib/api';

/**
 * Pantalla de un remito, para /remitos/nuevo (sin id) y /remitos/[id].
 * Nuevo o borrador => editor. Emitido o anulado => detalle (RemitoDetalle). Al emitir se
 * cambia de vista acá mismo: el editor ya dejó la dirección en
 * /remitos/[id] (después del primer autoguardado), así que navegar "a la
 * misma dirección" no recargaría nada.
 */
export function RemitoPantalla({ id }: { id?: string }) {
  const router = useRouter();
  const [remito, setRemito] = useState<Remito | null>(null);
  const [estado, setEstado] = useState<'loading' | 'error' | 'ready'>(id ? 'loading' : 'ready');

  const cargar = useCallback(async () => {
    if (!id) return;
    setEstado('loading');
    try {
      setRemito(await getRemito(id));
      setEstado('ready');
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        clearSession();
        router.push('/login');
        return;
      }
      setEstado('error');
    }
  }, [id, router]);

  useEffect(() => {
    if (!getUsuario()) {
      router.push('/login');
      return;
    }
    cargar();
  }, [cargar, router]);

  return (
    <Shell>
      {estado === 'error' ? (
        <ErrorState onRetry={cargar} />
      ) : estado === 'loading' ? (
        <p className="text-sm text-muted">Cargando…</p>
      ) : remito && remito.estado !== 'borrador' ? (
        <RemitoDetalle remito={remito} onCambio={setRemito} />
      ) : (
        <RemitoEditor inicial={remito ?? undefined} onEmitido={setRemito} />
      )}
    </Shell>
  );
}
