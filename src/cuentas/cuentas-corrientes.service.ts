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

    return cuenta;
  }
}
