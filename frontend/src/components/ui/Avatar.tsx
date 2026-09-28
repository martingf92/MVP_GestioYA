function iniciales(nombre: string): string {
  const partes = nombre.trim().split(/\s+/);
  const primera = partes[0]?.[0] ?? '';
  const segunda = partes.length > 1 ? partes[partes.length - 1][0] : '';
  return (primera + segunda).toUpperCase();
}

type Tono = 'verde' | 'terra' | 'neutro';

const tonos: Record<Tono, string> = {
  verde: 'bg-verde-soft text-verde-on-soft',
  terra: 'bg-terra-soft text-terra-on-soft',
  neutro: 'bg-canvas text-muted',
};

export function Avatar({
  nombre,
  tono = 'neutro',
  size = 36,
}: {
  nombre: string;
  tono?: Tono;
  size?: 36 | 40;
}) {
  return (
    <span
      className={`inline-flex flex-shrink-0 items-center justify-center rounded-full text-[12.5px] font-bold ${tonos[tono]}`}
      style={{ width: size, height: size }}
      aria-hidden
    >
      {iniciales(nombre)}
    </span>
  );
}
