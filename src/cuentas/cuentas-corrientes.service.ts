import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

// El callback de `this.prisma.db.$transaction(async (tx) => ...)` da un
// cliente extendido (por tenant.extension.ts) cuyo tipo generado no es
// estructuralmente compatible con Prisma.TransactionClient -- mismo tipo de
// fricción que ya se resuelve en otros lados con `as unknown as X`. Estos
// helpers se llaman siempre desde dentro de un $transaction real, así que
// en runtime `tx` sí tiene todos los métodos de Prisma normalmente.
type TxClient = any;

@Injectable()
export class CuentasCorrientesService {
  constructor(private readonly prisma: PrismaService) {}

  private async getOrCreate(tx: TxClient, entidadId: string) {
    const existing = await tx.cuentaCorriente.findUnique({ where: { entidadId } });
    if (existing) return existing;

    return tx.cuentaCorriente.create({
      // empresaId lo inyecta tenant.extension.ts en runtime, ver
      // entidades.service.ts para el mismo patrón.
      data: { entidadId } as unknown as Prisma.CuentaCorrienteCreateInput,
    });
  }

  /**
   * montoSigned: positivo suma al saldo (aumenta lo que la entidad debe),
   * negativo resta (disminuye lo que debe). El signo lo decide quien llama
   * -- acá solo se aplica y se deja el registro en MovimientoCuenta.
   */
  async registrarMovimiento(
    tx: TxClient,
    entidadId: string,
    tipo: 'debe' | 'haber' | 'ajuste',
    montoSigned: number,
    concepto: string,
    referenciaId: string,
    usuarioId?: string,
  ) {
    const cuenta = await this.getOrCreate(tx, entidadId);
    const saldoResultante = cuenta.saldoActual.toNumber() + montoSigned;

    await tx.cuentaCorriente.update({
      where: { id: cuenta.id },
      data: { saldoActual: saldoResultante },
    });

    await tx.movimientoCuenta.create({
      data: {
        cuentaCorrienteId: cuenta.id,
        tipo,
        concepto,
        referenciaId,
        monto: montoSigned,
        saldoResultante,
        usuarioId,
      },
    });
  }

  async getCuentaCorriente(entidadId: string) {
    const entidad = await this.prisma.db.entidad.findUnique({
      where: { id: entidadId },
    });
    if (!entidad) {
      throw new NotFoundException('Entidad no encontrada');
    }

    const cuenta = await this.prisma.db.cuentaCorriente.findUnique({
      where: { entidadId },
      include: { movimientos: { orderBy: { fecha: 'desc' } } },
    });

    if (!cuenta) {
      return { entidadId, saldoActual: 0, moneda: 'ARS', movimientos: [] };
    }

    return { ...cuenta, movimientos: await this.conOrigen(cuenta.movimientos) };
  }

  /**
   * MovimientoCuenta solo guarda un concepto en texto + referenciaId. Para
   * que la pantalla muestre de dónde vino cada movimiento (remito, cobro,
   * anulación) y si después se anuló, se resuelve la referencia contra
   * Obligacion / Pago en lugar de parsear el texto del concepto. Las
   * consultas van por `db` (tenant-scoped), así que una referencia de otra
   * empresa simplemente no se encuentra.
   */
  private async conOrigen<T extends { tipo: string; referenciaId: string | null }>(movimientos: T[]) {
    const refs = [...new Set(movimientos.map((m) => m.referenciaId).filter((r): r is string => !!r))];

    const [obligaciones, pagos] = await Promise.all([
      this.prisma.db.obligacion.findMany({
        where: { id: { in: refs } },
        select: { id: true, estado: true, remito: { select: { id: true, numero: true } } },
      }),
      this.prisma.db.pago.findMany({
        where: { id: { in: refs } },
        select: { id: true, estado: true, medio: true, _count: { select: { cheques: true } } },
      }),
    ]);
    const obligacionPorId = new Map(obligaciones.map((o) => [o.id, o]));
    const pagoPorId = new Map(pagos.map((p) => [p.id, p]));

    return movimientos.map((m) => {
      const obligacion = m.referenciaId ? obligacionPorId.get(m.referenciaId) : undefined;
      const pago = m.referenciaId ? pagoPorId.get(m.referenciaId) : undefined;

      // Una anulación (de obligación o de pago) se registra como 'ajuste'
      // que compensa el movimiento original -- ver ObligacionesService /
      // PagosService.anular.
      const tipoOrigen =
        m.tipo === 'ajuste'
          ? ('anulacion' as const)
          : pago
            ? ('pago' as const)
            : obligacion?.remito
              ? ('remito' as const)
              : obligacion
                ? ('obligacion' as const)
                : ('otro' as const);

      return {
        ...m,
        origen: {
          tipo: tipoOrigen,
          obligacionId: obligacion?.id ?? null,
          remito: obligacion?.remito ?? null,
          pago: pago ? { id: pago.id, medio: pago.medio, cheques: pago._count.cheques } : null,
          // El movimiento original sigue contando en el historial (el
          // saldoResultante de cada fila es histórico); "anulado" solo avisa
          // que después se compensó con un ajuste.
          anulado:
            m.tipo !== 'ajuste' &&
            (obligacion?.estado === 'anulada' || pago?.estado === 'rechazado'),
        },
      };
    });
  }
}
