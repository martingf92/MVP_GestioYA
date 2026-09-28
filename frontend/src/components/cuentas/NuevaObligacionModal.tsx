'use client';

import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Field } from '@/components/ui/Field';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Segmented } from '@/components/ui/Segmented';
import { AlertBanner } from '@/components/ui/AlertBanner';
import { ApiError, Entidad, createObligacion } from '@/lib/api';
import { EntidadSelect, GASTO_GENERAL } from './EntidadSelect';

type Direccion = 'a_cobrar' | 'a_pagar';

/**
 * Dos modos: con `entidadId` fijo (desde la cuenta corriente de una
 * entidad) o con `entidades` para elegir con quién es, incluido "gasto
 * general" sin entidad (desde el resumen de Cuentas).
 */
export function NuevaObligacionModal({
  entidadId,
  entidades,
  direccionSugerida = 'a_cobrar',
  onClose,
  onCreated,
}: {
  entidadId?: string;
  entidades?: Entidad[];
  direccionSugerida?: Direccion;
  onClose: () => void;
  onCreated: () => void;
}) {
  const conSelector = !entidadId;
  const [seleccion, setSeleccion] = useState(entidadId ?? '');
  const [direccion, setDireccion] = useState<Direccion>(direccionSugerida);
  const [monto, setMonto] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [vencimiento, setVencimiento] = useState('');
  const [errores, setErrores] = useState<{ monto?: string; entidad?: string }>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const esGasto = seleccion === GASTO_GENERAL;

  function elegir(valor: string) {
    setSeleccion(valor);
    // Un gasto general (alquiler, servicios) casi siempre es algo a pagar.
    if (valor === GASTO_GENERAL) setDireccion('a_pagar');
  }

  function validar(): boolean {
    const nuevos = {
      monto: Number(monto) > 0 ? undefined : 'Poné un monto mayor a cero',
      entidad: conSelector && !seleccion ? 'Elegí con quién es, o "gasto general"' : undefined,
    };
    setErrores(nuevos);
    return !nuevos.monto && !nuevos.entidad;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validar()) return;
    setBusy(true);
    setError(null);
    try {
      await createObligacion({
        entidadId: esGasto ? undefined : seleccion,
        direccion,
        monto: Number(monto),
        descripcion: descripcion || undefined,
        fechaVencimiento: vencimiento || undefined,
      });
      onCreated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error de conexión');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title="Nueva obligación" onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        {conSelector && (
          <Field label="¿Con quién es?" htmlFor="obl-entidad" error={errores.entidad}>
            <EntidadSelect
              id="obl-entidad"
              entidades={entidades ?? []}
              value={seleccion}
              onChange={elegir}
              error={!!errores.entidad}
            />
          </Field>
        )}
        <div className="flex flex-col gap-[7px]">
          <p className="text-[13px] font-semibold text-ink-soft">
            {esGasto ? '¿Es algo a pagar o a cobrar?' : '¿Quién le debe a quién?'}
          </p>
          <Segmented
            label="Dirección de la deuda"
            options={
              esGasto
                ? [
                    { value: 'a_pagar', label: 'A pagar' },
                    { value: 'a_cobrar', label: 'A cobrar' },
                  ]
                : [
                    { value: 'a_cobrar', label: 'Te debe' },
                    { value: 'a_pagar', label: 'Le debés' },
                  ]
            }
            value={direccion}
            onChange={setDireccion}
          />
        </div>
        <Field label="Monto" htmlFor="obl-monto" error={errores.monto}>
          <Input
            id="obl-monto"
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0.01"
            value={monto}
            error={!!errores.monto}
            onChange={(e) => setMonto(e.target.value)}
            onBlur={() => monto && validar()}
          />
        </Field>
        <Field label="Descripción (opcional)" htmlFor="obl-desc">
          <Input
            id="obl-desc"
            placeholder={esGasto ? 'Ej.: alquiler del local, octubre' : 'Ej.: factura 0001-00012345'}
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
          />
        </Field>
        <Field label="Vencimiento (opcional)" htmlFor="obl-venc">
          <Input id="obl-venc" type="date" value={vencimiento} onChange={(e) => setVencimiento(e.target.value)} />
        </Field>
        {esGasto && (
          <p className="text-[12.5px] text-muted">
            Un gasto general no tiene cuenta corriente: lo vas a ver en Cuentas → Obligaciones.
          </p>
        )}
        {error && <AlertBanner variant="error">{error}</AlertBanner>}
        <div className="mt-1 flex justify-end gap-2.5">
          <Button type="button" variant="ghost" onClick={onClose}>
            Descartar
          </Button>
          <Button type="submit" disabled={busy}>
            {busy ? 'Guardando…' : 'Cargar obligación'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
