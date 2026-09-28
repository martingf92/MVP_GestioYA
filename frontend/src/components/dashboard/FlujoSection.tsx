'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ChartColumn } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Segmented } from '@/components/ui/Segmented';
import { Skeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { Button } from '@/components/ui/Button';
import { DashboardFlujo, PeriodoFlujo, getDashboardFlujo } from '@/lib/api';
import { formatMonto, formatMontoCompacto } from '@/lib/format';

// Mismos valores que --color-chart-ingreso / --color-chart-egreso del tema.
// Recharts pinta SVG con atributos `fill`, no con clases de Tailwind.
const INGRESO = '#23805c';
const EGRESO = '#b4492c';
const LINEA = '#F0E9DE';
const EJE = '#E5DACA';
const MUTED = '#8A7F70';

const PERIODOS: { value: PeriodoFlujo; label: string }[] = [
  { value: 'diario', label: 'Diario' },
  { value: 'semanal', label: 'Semanal' },
  { value: 'mensual', label: 'Mensual' },
];

const DESCRIPCION: Record<PeriodoFlujo, string> = {
  diario: 'en los últimos 14 días',
  semanal: 'en las últimas 8 semanas',
  mensual: 'en los últimos 6 meses',
};

export function FlujoSection() {
  const [periodo, setPeriodo] = useState<PeriodoFlujo>('diario');
  const [data, setData] = useState<DashboardFlujo | null>(null);
  const [estado, setEstado] = useState<'loading' | 'error' | 'ready'>('loading');
  const [verTabla, setVerTabla] = useState(false);

  const cargar = useCallback(async (p: PeriodoFlujo) => {
    setEstado('loading');
    try {
      setData(await getDashboardFlujo(p));
      setEstado('ready');
    } catch {
      setEstado('error');
    }
  }, []);

  useEffect(() => {
    cargar(periodo);
  }, [cargar, periodo]);

  const sinMovimientos = !!data && data.totalIngresos === 0 && data.totalEgresos === 0;
  const neto = data ? data.totalIngresos - data.totalEgresos : 0;

  return (
    <section aria-labelledby="flujo-titulo">
      <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 id="flujo-titulo" className="font-serif text-[19px] font-semibold text-ink">
            Cómo viene la plata
          </h2>
          <p className="text-[13px] text-muted">Cobros y pagos registrados {DESCRIPCION[periodo]}</p>
        </div>
        <div className="sm:w-[300px]">
          <Segmented
            label="Período del gráfico"
            size="sm"
            options={PERIODOS}
            value={periodo}
            onChange={setPeriodo}
          />
        </div>
      </div>

      <Card padded={false} className="p-4 sm:p-5">
        {estado === 'error' && !data ? (
          <ErrorState onRetry={() => cargar(periodo)} />
        ) : !data ? (
          <div className="flex flex-col gap-4">
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-[240px] w-full !bg-[#F5F0E7]" />
          </div>
        ) : (
          // Al cambiar de período se mantiene el render anterior atenuado en
          // vez de volver al skeleton -- sin salto de layout.
          <div
            className={`transition-opacity duration-[120ms] ${estado === 'loading' ? 'opacity-50' : ''}`}
            aria-busy={estado === 'loading'}
          >
            <dl className="mb-4 grid grid-cols-3 gap-3">
              <Total color={INGRESO} label="Entró" valor={formatMonto(data.totalIngresos)} />
              <Total color={EGRESO} label="Salió" valor={formatMonto(data.totalEgresos)} />
              <Total
                label="Neto"
                valor={`${neto > 0 ? '+ ' : neto < 0 ? '− ' : ''}${formatMonto(neto)}`}
              />
            </dl>

            {sinMovimientos ? (
              <div className="flex flex-col items-center gap-2 rounded-lg bg-paper-hover px-4 py-10 text-center">
                <ChartColumn className="h-8 w-8 text-muted" strokeWidth={1.5} aria-hidden />
                <p className="text-[14.5px] font-semibold text-ink">
                  No hubo cobros ni pagos {DESCRIPCION[periodo]}
                </p>
                <p className="max-w-sm text-[13px] text-ink-soft">
                  Cuando registres un pago aplicado a una obligación, aparece acá.
                </p>
                {periodo !== 'mensual' && (
                  <Button variant="secondary" className="mt-2" onClick={() => setPeriodo('mensual')}>
                    Ver los últimos 6 meses
                  </Button>
                )}
              </div>
            ) : verTabla ? (
              <TablaFlujo data={data} />
            ) : (
              <div className="tabular h-[240px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={data.puntos}
                    barGap={2}
                    barCategoryGap="22%"
                    margin={{ top: 8, right: 4, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid vertical={false} stroke={LINEA} />
                    <XAxis
                      dataKey="etiqueta"
                      tickLine={false}
                      axisLine={{ stroke: EJE }}
                      tick={{ fill: MUTED, fontSize: 11.5 }}
                      minTickGap={6}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      tickFormatter={formatMontoCompacto}
                      tickLine={false}
                      axisLine={false}
                      tick={{ fill: MUTED, fontSize: 11.5 }}
                      width={64}
                      allowDecimals={false}
                    />
                    <Tooltip
                      cursor={{ fill: LINEA, fillOpacity: 0.6 }}
                      content={<FlujoTooltip />}
                    />
                    <Bar
                      dataKey="ingresos"
                      fill={INGRESO}
                      radius={[4, 4, 0, 0]}
                      maxBarSize={24}
                      isAnimationActive={false}
                    />
                    <Bar
                      dataKey="egresos"
                      fill={EGRESO}
                      radius={[4, 4, 0, 0]}
                      maxBarSize={24}
                      isAnimationActive={false}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {!sinMovimientos && (
              <div className="mt-3 flex justify-end">
                <button
                  type="button"
                  onClick={() => setVerTabla((v) => !v)}
                  className="text-[13px] font-medium text-verde hover:underline"
                >
                  {verTabla ? 'Ver gráfico' : 'Ver como tabla'}
                </button>
              </div>
            )}
          </div>
        )}
      </Card>
    </section>
  );
}

function Swatch({ color }: { color: string }) {
  return (
    <span
      className="inline-block h-2.5 w-2.5 flex-shrink-0 rounded-[3px]"
      style={{ backgroundColor: color }}
      aria-hidden
    />
  );
}

function Total({ color, label, valor }: { color?: string; label: string; valor: string }) {
  return (
    <div className="min-w-0">
      <dt className="flex items-center gap-1.5 text-[12.5px] text-muted">
        {color && <Swatch color={color} />}
        {label}
      </dt>
      <dd className="truncate font-serif text-[17px] font-semibold text-ink tabular sm:text-[20px]">
        {valor}
      </dd>
    </div>
  );
}

function FlujoTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { dataKey?: string | number; value?: number }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const ingresos = Number(payload.find((p) => p.dataKey === 'ingresos')?.value ?? 0);
  const egresos = Number(payload.find((p) => p.dataKey === 'egresos')?.value ?? 0);
  return (
    <div className="rounded-lg border border-line bg-white px-3 py-2.5 text-[13px] shadow-[var(--shadow-pop)]">
      <p className="mb-1.5 font-semibold text-ink">{label}</p>
      <p className="flex items-center gap-2 text-ink-soft">
        <Swatch color={INGRESO} /> Entró <span className="ml-auto pl-3 font-semibold text-ink tabular">{formatMonto(ingresos)}</span>
      </p>
      <p className="flex items-center gap-2 text-ink-soft">
        <Swatch color={EGRESO} /> Salió <span className="ml-auto pl-3 font-semibold text-ink tabular">{formatMonto(egresos)}</span>
      </p>
    </div>
  );
}

function TablaFlujo({ data }: { data: DashboardFlujo }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[320px] border-collapse text-left text-[13.5px]">
        <caption className="sr-only">Cobros y pagos por período</caption>
        <thead>
          <tr className="border-b border-line">
            {['Período', 'Entró', 'Salió', 'Neto'].map((h, i) => (
              <th
                key={h}
                scope="col"
                className={`py-2 text-[12px] font-bold tracking-[0.1em] text-muted uppercase ${i > 0 ? 'text-right' : ''}`}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="tabular">
          {data.puntos.map((p) => {
            const neto = p.ingresos - p.egresos;
            return (
              <tr key={p.clave} className="border-b border-line-soft last:border-0">
                <th scope="row" className="py-2 font-medium text-ink">
                  {p.etiqueta}
                </th>
                <td className="py-2 text-right text-ink-soft">{formatMonto(p.ingresos)}</td>
                <td className="py-2 text-right text-ink-soft">{formatMonto(p.egresos)}</td>
                <td className="py-2 text-right font-semibold text-ink">
                  {neto > 0 ? '+ ' : neto < 0 ? '− ' : ''}
                  {formatMonto(neto)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
