import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

type Periodo = 'diario' | 'semanal' | 'mensual';

// Los períodos se arman en hora argentina, no en la del servidor: en
// producción el servidor puede correr en UTC y un pago de las 22hs del
// lunes caería en el martes.
const TZ = 'America/Argentina/Buenos_Aires';
const DIA_MS = 86_400_000;

const CANTIDAD: Record<Periodo, number> = { diario: 14, semanal: 8, mensual: 6 };

function ymd(d: Date): string {
  return d.toLocaleDateString('en-CA', { timeZone: TZ });
}

function lunesDe(d: Date): string {
  const [y, m, dia] = ymd(d).split('-').map(Number);
  const utc = new Date(Date.UTC(y, m - 1, dia, 12));
  const retroceso = (utc.getUTCDay() + 6) % 7;
  return ymd(new Date(utc.getTime() - retroceso * DIA_MS));
}

function claveDe(d: Date, periodo: Periodo): string {
  if (periodo === 'diario') return ymd(d);
  if (periodo === 'semanal') return lunesDe(d);
  return ymd(d).slice(0, 7);
}

function etiquetaDe(clave: string, periodo: Periodo): string {
  const [y, m, d] = clave.split('-').map(Number);
  if (periodo === 'mensual') {
    return new Date(Date.UTC(y, m - 1, 15)).toLocaleDateString('es-AR', {
      month: 'short',
      timeZone: 'UTC',
    });
  }
  return `${periodo === 'semanal' ? 'sem ' : ''}${d}/${m}`;
}

function construirClaves(periodo: Periodo, ahora: Date): string[] {
  const claves: string[] = [];
  const n = CANTIDAD[periodo];
  if (periodo === 'mensual') {
    const [y, m] = ymd(ahora).split('-').map(Number);
    for (let i = n - 1; i >= 0; i--) {
      const fecha = new Date(Date.UTC(y, m - 1 - i, 15));
      claves.push(fecha.toISOString().slice(0, 7));
    }
    return claves;
  }
  const paso = periodo === 'semanal' ? 7 : 1;
  for (let i = n - 1; i >= 0; i--) {
    claves.push(claveDe(new Date(ahora.getTime() - i * paso * DIA_MS), periodo));
  }
  return claves;
}

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async resumen() {
    const ahora = new Date();
    const en7Dias = new Date(ahora.getTime() + 7 * DIA_MS);

    const abiertas = await this.prisma.db.obligacion.findMany({
      where: { estado: { in: ['pendiente', 'parcial'] } },
      include: {
        entidad: { select: { id: true, nombre: true } },
        // Mismo criterio que ObligacionesService: un pago anulado no cuenta.
        aplicaciones: {
          where: { pago: { estado: { not: 'rechazado' } } },
          select: { monto: true },
        },
      },
    });

    const conSaldo = abiertas.map((o) => {
      const pagado = o.aplicaciones.reduce((s, a) => s + a.monto.toNumber(), 0);
      return {
        id: o.id,
        direccion: o.direccion,
        descripcion: o.descripcion ?? o.tipo,
        entidad: o.entidad,
        fechaVencimiento: o.fechaVencimiento,
        saldo: o.monto.toNumber() - pagado,
        vencida: !!o.fechaVencimiento && o.fechaVencimiento < ahora,
      };
    });

    const resumir = (direccion: string) => {
      const items = conSaldo.filter((o) => o.direccion === direccion);
      return {
        total: items.reduce((s, o) => s + o.saldo, 0),
        vencido: items.filter((o) => o.vencida).reduce((s, o) => s + o.saldo, 0),
        cantidad: items.length,
        cantidadVencidas: items.filter((o) => o.vencida).length,
        vencenEstaSemana: items.filter(
          (o) => !o.vencida && o.fechaVencimiento && o.fechaVencimiento <= en7Dias,
        ).length,
      };
    };

    const [anio, mes] = ymd(ahora).split('-').map(Number);
    const inicioMes = new Date(Date.UTC(anio, mes - 1, 1, 3)); // 00:00 AR = 03:00 UTC
    const [remitosMes, emitidos, borradores] = await Promise.all([
      this.prisma.db.remito.count({ where: { fecha: { gte: inicioMes } } }),
      this.prisma.db.remito.count({ where: { fecha: { gte: inicioMes }, estado: 'emitido' } }),
      this.prisma.db.remito.count({ where: { estado: 'borrador' } }),
    ]);

    // "Para reclamar primero": lo que nos deben, vencido primero y por
    // antigüedad; después lo que vence antes; sin vencimiento al final.
    const paraReclamar = conSaldo
      .filter((o) => o.direccion === 'a_cobrar' && o.entidad)
      .sort((a, b) => {
        const fa = a.fechaVencimiento?.getTime() ?? Number.POSITIVE_INFINITY;
        const fb = b.fechaVencimiento?.getTime() ?? Number.POSITIVE_INFINITY;
        return fa - fb;
      })
      .slice(0, 5);

    return {
      aCobrar: resumir('a_cobrar'),
      aPagar: resumir('a_pagar'),
      remitosMes: { total: remitosMes, emitidos, borradoresSinEmitir: borradores },
      paraReclamar,
    };
  }

  /**
   * Ingresos = pagos aplicados a obligaciones a_cobrar (cobros). Egresos =
   * pagos aplicados a obligaciones a_pagar. Se cuenta por AplicacionPago,
   * no por Pago.monto: la aplicación es lo que dice hacia dónde fue la
   * plata. Un pago sin aplicaciones no suma a ninguno de los dos.
   */
  async flujo(periodo: Periodo) {
    const ahora = new Date();
    const claves = construirClaves(periodo, ahora);
    const ventanaDias = periodo === 'diario' ? 15 : periodo === 'semanal' ? 63 : 200;

    const pagos = await this.prisma.db.pago.findMany({
      where: {
        fecha: { gte: new Date(ahora.getTime() - ventanaDias * DIA_MS) },
        estado: { not: 'rechazado' },
      },
      select: {
        fecha: true,
        aplicaciones: { select: { monto: true, obligacion: { select: { direccion: true } } } },
      },
    });

    const acumulado = new Map(claves.map((c) => [c, { ingresos: 0, egresos: 0 }]));
    for (const pago of pagos) {
      const bucket = acumulado.get(claveDe(pago.fecha, periodo));
      if (!bucket) continue;
      for (const a of pago.aplicaciones) {
        if (a.obligacion.direccion === 'a_pagar') bucket.egresos += a.monto.toNumber();
        else bucket.ingresos += a.monto.toNumber();
      }
    }

    const puntos = claves.map((clave) => ({
      clave,
      etiqueta: etiquetaDe(clave, periodo),
      ...acumulado.get(clave)!,
    }));

    return {
      periodo,
      puntos,
      totalIngresos: puntos.reduce((s, p) => s + p.ingresos, 0),
      totalEgresos: puntos.reduce((s, p) => s + p.egresos, 0),
    };
  }
}
