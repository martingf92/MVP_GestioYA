import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CuentasCorrientesService } from './cuentas-corrientes.service';
import { ObligacionesService } from './obligaciones.service';
import { CreatePagoDto } from './dto/create-pago.dto';
import { ListPagosQueryDto } from './dto/list-pagos-query.dto';

const INCLUDE_PAGO = {
  entidad: true,
  cheques: true,
  aplicaciones: { include: { obligacion: true } },
} as const;

@Injectable()
export class PagosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cuentasCorrientes: CuentasCorrientesService,
    private readonly obligacionesService: ObligacionesService,
  ) {}

  async create(dto: CreatePagoDto, usuarioId: string) {
    if (dto.entidadId) {
      await this.assertEntidadExists(dto.entidadId);
    }

    const sumAplicaciones = (dto.aplicaciones ?? []).reduce((s, a) => s + a.monto, 0);
    if (sumAplicaciones > dto.monto) {
      throw new BadRequestException(
        'La suma de las aplicaciones no puede superar el monto del pago',
      );
    }

    const pago = await this.prisma.db.$transaction(async (tx) => {
      const created = await tx.pago.create({
        // empresaId lo inyecta tenant.extension.ts en runtime, ver
        // entidades.service.ts para el mismo patrón.
        data: {
          entidadId: dto.entidadId,
          monto: dto.monto,
          medio: dto.medio,
          estado: 'confirmado',
          // fechaEmision/fechaCobro necesitan Date, no el string ISO crudo
          // -- mismo bug encontrado en Obligacion.fechaVencimiento.
          cheques: dto.cheques
            ? {
                create: dto.cheques.map((c) => ({
                  ...c,
                  fechaEmision: c.fechaEmision ? new Date(c.fechaEmision) : undefined,
                  fechaCobro: c.fechaCobro ? new Date(c.fechaCobro) : undefined,
                })),
              }
            : undefined,
        } as unknown as Prisma.PagoCreateInput,
      });

      for (const aplicacion of dto.aplicaciones ?? []) {
        const obligacion = await this.obligacionesService.assertObligacionAplicable(
          tx,
          aplicacion.obligacionId,
        );

        const aplicadasPrevias = await tx.aplicacionPago.findMany({
          where: {
            obligacionId: aplicacion.obligacionId,
            pago: { estado: { not: 'rechazado' } },
          },
        });
        const montoPagadoPrevio = aplicadasPrevias.reduce(
          (s, a) => s + a.monto.toNumber(),
          0,
        );
        const saldoPendiente = obligacion.monto.toNumber() - montoPagadoPrevio;

        if (aplicacion.monto > saldoPendiente + 0.001) {
          throw new BadRequestException(
            `El monto aplicado a la obligación ${aplicacion.obligacionId} excede su saldo pendiente (${saldoPendiente.toFixed(2)})`,
          );
        }

        await tx.aplicacionPago.create({
          data: {
            pagoId: created.id,
            obligacionId: aplicacion.obligacionId,
            monto: aplicacion.monto,
          },
        });

        if (obligacion.entidadId) {
          await this.cuentasCorrientes.registrarMovimiento(
            tx,
            obligacion.entidadId,
            'haber',
            -aplicacion.monto,
            `Pago aplicado a obligación: ${obligacion.descripcion ?? obligacion.tipo ?? obligacion.id}`,
            created.id,
            usuarioId,
          );
        }

        await this.obligacionesService.recomputeEstado(tx, aplicacion.obligacionId);
      }

      return created;
    });

    return this.findOne(pago.id);
  }

  async findAll(query: ListPagosQueryDto) {
    const where: Prisma.PagoWhereInput = { entidadId: query.entidadId };

    const [data, total] = await Promise.all([
      this.prisma.db.pago.findMany({
        where,
        include: INCLUDE_PAGO,
        orderBy: { fecha: 'desc' },
        skip: query.skip,
        take: query.take,
      }),
      this.prisma.db.pago.count({ where }),
    ]);

    return { data, total, skip: query.skip, take: query.take };
  }

  async findOne(id: string) {
    const pago = await this.prisma.db.pago.findUnique({
      where: { id },
      include: INCLUDE_PAGO,
    });

    if (!pago) {
      throw new NotFoundException('Pago no encontrado');
    }

    return pago;
  }

  async anular(id: string, usuarioId: string) {
    const pago = await this.findOne(id);

    if (pago.estado === 'rechazado') {
      throw new ConflictException('El pago ya está anulado');
    }

    await this.prisma.db.$transaction(async (tx) => {
      await tx.pago.update({ where: { id }, data: { estado: 'rechazado' } });

      for (const aplicacion of pago.aplicaciones) {
        if (aplicacion.obligacion.entidadId) {
          await this.cuentasCorrientes.registrarMovimiento(
            tx,
            aplicacion.obligacion.entidadId,
            'ajuste',
            aplicacion.monto.toNumber(),
            `Reversión de pago aplicado a obligación: ${aplicacion.obligacion.descripcion ?? aplicacion.obligacion.tipo ?? aplicacion.obligacion.id}`,
            id,
            usuarioId,
          );
        }
        await this.obligacionesService.recomputeEstado(tx, aplicacion.obligacionId);
      }
    });

    return this.findOne(id);
  }

  private async assertEntidadExists(entidadId: string) {
    const entidad = await this.prisma.db.entidad.findUnique({
      where: { id: entidadId },
    });
    if (!entidad || !entidad.activo) {
      throw new BadRequestException(
        'entidadId inválido, dado de baja, o no pertenece a esta empresa',
      );
    }
  }
}
