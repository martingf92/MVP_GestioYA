import { Clock, CircleCheck } from 'lucide-react';
import { Entidad } from '@/lib/api';
import { formatMonto, formatMontoConSigno, diasDesde, formatFechaCorta } from '@/lib/format';

function rolesTexto(e: Entidad): string {
  const roles = [e.cliente && 'Cliente', e.proveedor && 'proveedor', e.acreedor && 'acreedor'].filter(
    Boolean,
  ) as string[];
  if (roles.length === 0) return 'Sin rol asignado';
  const [primero, ...resto] = roles;
  const texto = [primero.charAt(0).toUpperCase() + primero.slice(1), ...resto];
  return texto.length > 1 ? `${texto.slice(0, -1).join(', ')} y ${texto[texto.length - 1]}` : texto[0];
}

export function SaldoHero({
  entidad,
  saldo,
  vencido,
  masViejaVencida,
  proximoVencimiento,
}: {
  entidad: Entidad;
  saldo: number;
  /** Parte del saldo (en la dirección del saldo) que ya venció. */
  vencido: number;
  masViejaVencida: string | null;
  proximoVencimiento: string | null;
}) {
  const signo = saldo > 0 ? 'pos' : saldo < 0 ? 'neg' : 'cero';
  const fondo =
    signo === 'pos'
      ? 'bg-verde text-white'
      : signo === 'neg'
        ? 'bg-neg text-white'
        : 'border border-line bg-paper text-ink';
  const tenue = signo === 'cero' ? 'text-muted' : signo === 'pos' ? 'text-[#A9C9BD]' : 'text-white/70';
  const frase =
    signo === 'pos'
      ? `Te deben ${formatMonto(saldo, { centavos: true })}`
      : signo === 'neg'
        ? `Le debés ${formatMonto(saldo, { centavos: true })}`
        : 'Están al día';
  const documento = entidad.documentoNro
    ? `${entidad.documentoTipo ?? 'Doc.'} ${entidad.documentoNro}`
    : 'Sin documento';

  return (
    <section
      aria-label="Saldo de la cuenta corriente"
      className={`flex flex-col gap-4 rounded-2xl px-5 py-6 nav:px-8 nav:py-7 ${fondo}`}
    >
      <div className="flex items-center gap-3">
        <span
          className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-[13px] font-bold
            ${signo === 'cero' ? 'bg-canvas text-muted' : 'bg-white/15 text-white'}`}
          aria-hidden
        >
          {entidad.nombre
            .split(/\s+/)
            .filter(Boolean)
            .slice(0, 2)
            .map((p) => p[0]?.toUpperCase())
            .join('')}
        </span>
        <div className="min-w-0">
          <p className="truncate text-[16px] font-semibold">{entidad.nombre}</p>
          <p className={`truncate text-[12.5px] ${tenue}`}>
            {documento} · {rolesTexto(entidad)}
          </p>
        </div>
      </div>

      <div>
        {/* Frase primero, número después: el signo solo nunca alcanza. */}
        <p className="font-serif text-[22px] leading-tight font-semibold nav:text-[26px]">{frase}</p>
        <p
          aria-live="polite"
          className="mt-1 font-serif text-[40px] leading-none font-semibold tracking-[-0.02em] tabular break-all nav:text-[58px]"
        >
          {formatMontoConSigno(saldo, { centavos: true })}
        </p>
      </div>

      {signo !== 'cero' && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          {vencido > 0 ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-warn-soft-border bg-warn-soft px-3 py-1 text-[13px] font-semibold text-warn-on-soft">
              <Clock className="h-3.5 w-3.5" aria-hidden />
              {vencido >= Math.abs(saldo) - 0.005
                ? 'Todo el saldo está vencido'
                : `${formatMonto(vencido)} vencidos`}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[13px] font-semibold">
              <CircleCheck className="h-3.5 w-3.5" aria-hidden />
              Nada vencido
            </span>
          )}
          <span className={`text-[13px] ${tenue}`}>
            {masViejaVencida
              ? `La obligación más vieja venció hace ${diasDesde(masViejaVencida)} ${diasDesde(masViejaVencida) === 1 ? 'día' : 'días'}`
              : proximoVencimiento
                ? `Próximo vencimiento: ${formatFechaCorta(proximoVencimiento)}`
                : 'Sin fechas de vencimiento cargadas'}
          </span>
        </div>
      )}
    </section>
  );
}
