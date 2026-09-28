import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CuentasCorrientesService } from './cuentas-corrientes.service';
import { CreateObligacionDto } from './dto/create-obligacion.dto';
import { ListObligacionesQueryDto } from './dto/list-obligaciones-query.dto';

// Ver el mismo comentario en cuentas-corrientes.service.ts.
type TxClient = any;

const INCLUDE_OBLIGACION = {
  entidad: { include: { proveedor: true, acreedor: true } },
  // Solo cuentan las aplicaciones de pagos que no fueron anulados (estado
  // != 'rechazado', ver PagosService.anular) -- si se incluyeran todas, un
  // pago anulado seguiría "contando" como pagado.
  aplicaciones: { where: { pago: { estado: { not: 'rechazado' } } } },
  // Para la vista comparativa Proveedor vs Acreedor: de dónde vino la
  // obligación cuando se generó automáticamente al emitir un remito.
  remito: { select: { numero: true, fecha: true, tipo: true } },
} as const;

type ObligacionConAplicaciones = Prisma.ObligacionGetPayload<{
  include: typeof INCLUDE_OBLIGACION;
}>;

function withComputed(o: ObligacionConAplicaciones) {
  const montoPagado = o.aplicaciones.reduce((sum, a) => sum + a.monto.toNumber(), 0);
  const monto = o.monto.toNumber();
  const vencida =
    !!o.fechaVencimiento &&
    o.fechaVencimiento < new Date() &&
    (o.estado === 'pendiente' || o.estado === 'parcial');

  return { ...o, montoPagado, saldo: monto - montoPagado, vencida };
}

// a_cobrar (la entidad nos debe): +1, mismo signo que ya usaba el código
// original. a_pagar (nosotros le debemos a la entidad): -1, hace que el
// saldo de su cuenta corriente baje de 0 en vez de subir. Ver comentario de
// Obligacion.direccion en schema.prisma.
export function signoDireccion(direccion: string): 1 | -1 {
  return direccion === 'a_pagar' ? -1 : 1;
}

type CreateObligacionParams = {
  entidadId?: string;
  monto: number;
  tipo?: string;
  descripcion?: string;
  direccion?: string;
  fechaVencimiento?: Date;
  remitoId?: string;
};

@Injectable()
export class ObligacionesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cuentasCorrientes: CuentasCorrientesService,
  ) {}

  /**
   * Lógica de creación reutilizable dentro de una transacción externa --
   * usado por create() (abre su propia transacción) y por
   * RemitosService.emitir() (la obligación tiene que quedar atómica con el
   * cambio de estado del remito, ver NOTAS.md).
   */
  async createWithinTx(tx: TxClient, params: CreateObligacionParams, usuarioId?: string) {
    const direccion = params.direccion ?? 'a_cobrar';

    const created = await tx.obligacion.create({
      // empresaId lo inyecta tenant.extension.ts en runtime, ver
      // entidades.service.ts para el mismo patrón.
      data: {
        entidadId: params.entidadId,
        monto: params.monto,
        tipo: params.tipo,
        descripcion: params.descripcion,
        direccion,
        remitoId: params.remitoId,
        fechaVencimiento: params.fechaVencimiento,
        estado: 'pendiente',
      } as unknown as Prisma.ObligacionCreateInput,
    });

    if (params.entidadId) {
      const signo = signoDireccion(direccion);
      await this.cuentasCorrientes.registrarMovimiento(
        tx,
        params.entidadId,
        signo > 0 ? 'debe' : 'haber',
        signo * params.monto,
        `Obligación: ${params.descripcion ?? params.tipo ?? created.id}`,
        created.id,
        usuarioId,
      );
    }

    return created;
  }

  async create(dto: CreateObligacionDto, usuarioId: string) {
    if (dto.entidadId) {
      await this.assertEntidadExists(dto.entidadId);
    }

    const obligacion = await this.prisma.db.$transaction((tx) =>
      this.createWithinTx(
        tx,
        {
          entidadId: dto.entidadId,
          monto: dto.monto,
          tipo: dto.tipo,
          descripcion: dto.descripcion,
          direccion: dto.direccion,
          // new Date(...), no el string crudo: class-validator@IsDateString
          // acepta fechas sin horario ("2020-01-01"), pero Prisma exige un
          // datetime ISO completo y tira 500 si le llega solo la fecha.
          fechaVencimiento: dto.fechaVencimiento ? new Date(dto.fechaVencimiento) : undefined,
        },
        usuarioId,
      ),
    );

    return this.findOne(obligacion.id);
  }

  async findAll(query: ListObligacionesQueryDto) {
    const where: Prisma.ObligacionWhereInput = {
      entidadId: query.sinEntidad ? null : query.entidadId,
      estado: query.estado === 'abiertas' ? { in: ['pendiente', 'parcial'] } : query.estado,
      direccion: query.direccion,
      entidad:
        query.tipoEntidad === 'proveedor'
          ? { proveedor: { isNot: null } }
          : query.tipoEntidad === 'acreedor'
            ? { acreedor: { isNot: null } }
            : undefined,
    };

    const [data, total] = await Promise.all([
      this.prisma.db.obligacion.findMany({
        where,
        include: INCLUDE_OBLIGACION,
        orderBy: { fechaEmision: query.orderDir ?? 'desc' },
        skip: query.skip,
        take: query.take,
      }),
      this.prisma.db.obligacion.count({ where }),
    ]);

    return { data: data.map(withComputed), total, skip: query.skip, take: query.take };
  }

  async findOne(id: string) {
    const obligacion = await this.prisma.db.obligacion.findUnique({
      where: { id },
      include: INCLUDE_OBLIGACION,
    });

    if (!obligacion) {
      throw new NotFoundException('Obligación no encontrada');
    }

    return withComputed(obligacion);
  }

  async anular(id: string, usuarioId: string) {
    const obligacion = await this.findOne(id);

    if (obligacion.estado === 'anulada') {
      throw new ConflictException('La obligación ya está anulada');
    }
    if (obligacion.montoPagado > 0) {
      throw new ConflictException(
        'No se puede anular una obligación con pagos aplicados',
      );
    }

    await this.prisma.db.$transaction((tx) => this.anularWithinTx(tx, id, usuarioId));

    return this.findOne(id);
  }

  /**
   * Misma lógica que anular(), pero componible dentro de una transacción
   * externa -- usado también por RemitosService.anular() cuando el remito
   * tiene una obligación generada automáticamente sin pagos aplicados.
   */
  async anularWithinTx(tx: TxClient, id: string, usuarioId?: string) {
    const obligacion = await tx.obligacion.findUniqueOrThrow({ where: { id } });

    await tx.obligacion.update({ where: { id }, data: { estado: 'anulada' } });

    if (obligacion.entidadId) {
      const signo = signoDireccion(obligacion.direccion);
      await this.cuentasCorrientes.registrarMovimiento(
        tx,
        obligacion.entidadId,
        'ajuste',
        -signo * obligacion.monto.toNumber(),
        `Anulación de obligación: ${obligacion.descripcion ?? obligacion.tipo ?? id}`,
        id,
        usuarioId,
      );
    }
  }

  /**
   * Llamado desde PagosService después de aplicar o revertir un pago sobre
   * esta obligación -- recalcula pendiente/parcial/cancelada en base a la
   * suma real de AplicacionPago (nunca se confía en un contador aparte).
   * No toca obligaciones ya anuladas (estado terminal).
   */
  async recomputeEstado(tx: TxClient, obligacionId: string) {
    const obligacion = await tx.obligacion.findUniqueOrThrow({
      where: { id: obligacionId },
    });
    if (obligacion.estado === 'anulada') return;

    const aplicaciones = await tx.aplicacionPago.findMany({
      where: { obligacionId, pago: { estado: { not: 'rechazado' } } },
    });
    const montoPagado = aplicaciones.reduce(
      (sum: number, a: Prisma.AplicacionPagoGetPayload<object>) =>
        sum + a.monto.toNumber(),
      0,
    );
    const monto = obligacion.monto.toNumber();
    const estado =
      montoPagado <= 0 ? 'pendiente' : montoPagado >= monto ? 'cancelada' : 'parcial';

    await tx.obligacion.update({ where: { id: obligacionId }, data: { estado } });
  }

  /**
   * Usado por PagosService para validar un obligacionId recibido en el
   * body: mismo chequeo cross-tenant que ya se usa en Productos/Remitos.
   */
  async assertObligacionAplicable(tx: TxClient, obligacionId: string) {
    const obligacion = await tx.obligacion.findUnique({ where: { id: obligacionId } });
    if (!obligacion || obligacion.estado === 'anulada' || obligacion.estado === 'cancelada') {
      throw new BadRequestException(
        'obligacionId inválido, ya cancelado/anulado, o no pertenece a esta empresa',
      );
    }
    return obligacion;
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
