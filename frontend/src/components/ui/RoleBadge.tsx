export type RolEntidad = 'cliente' | 'proveedor' | 'acreedor';

const LABELS: Record<RolEntidad, string> = {
  cliente: 'Cliente',
  proveedor: 'Proveedor',
  acreedor: 'Acreedor',
};

const ESTILOS: Record<RolEntidad, string> = {
  cliente: 'bg-verde-soft text-verde-on-soft',
  proveedor: 'bg-terra-soft text-terra-on-soft',
  acreedor: 'bg-warn-soft text-warn-on-soft',
};

const ESTILO_BAJA = 'bg-canvas text-muted';

export function RoleBadge({ rol, activo = true }: { rol: RolEntidad; activo?: boolean }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-[9px] py-[4px] text-[12px] font-semibold ${
        activo ? ESTILOS[rol] : ESTILO_BAJA
      }`}
    >
      {LABELS[rol]}
    </span>
  );
}

/** Fila de badges de rol -- una Entidad puede tener 1, 2 o 3 a la vez. */
export function RoleBadgeRow({
  cliente,
  proveedor,
  acreedor,
  activo = true,
}: {
  cliente: boolean;
  proveedor: boolean;
  acreedor: boolean;
  activo?: boolean;
}) {
  const roles: RolEntidad[] = [
    ...(cliente ? (['cliente'] as const) : []),
    ...(proveedor ? (['proveedor'] as const) : []),
    ...(acreedor ? (['acreedor'] as const) : []),
  ];

  if (roles.length === 0) {
    return <span className="text-[12.5px] text-muted">Sin rol asignado</span>;
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {roles.map((rol) => (
        <RoleBadge key={rol} rol={rol} activo={activo} />
      ))}
    </div>
  );
}
