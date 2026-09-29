import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContext } from '../common/tenant/tenant-context';
import { ObligacionesService } from '../cuentas/obligaciones.service';
import { buildRemitoPdf } from './remito-pdf';
import { CreateRemitoDto } from './dto/create-remito.dto';
import { UpdateRemitoDto } from './dto/update-remito.dto';
import { ListRemitosQueryDto } from './dto/list-remitos-query.dto';
import { CreateDetalleRemitoDto } from './dto/create-detalle-remito.dto';

const INCLUDE_DETALLE = {
  detalles: { include: { producto: { include: { unidadMedida: true } } } },
  entidad: true,
  // Para poder mostrar/chequear la obligación generada al emitir (ver
  // emitir()/anular() más abajo). Mismo filtro de aplicaciones que usa
  // ObligacionesService: un pago anulado no cuenta como pagado.
  obligacionGenerada: {
    include: { aplicaciones: { where: { pago: { estado: { not: 'rechazado' } } } } },
  },
} as const;

@Injectable()
export class RemitosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly obligacionesService: ObligacionesService,
  ) {}

  async create(dto: CreateRemitoDto, usuarioId: string) {
    if (dto.entidadId) {
      await this.assertEntidadExists(dto.entidadId);
    }
    await this.assertProductosExist(dto.detalles);

    return this.prisma.db.remito.create({
      // empresaId lo inyecta tenant.extension.ts en runtime, ver
      // entidades.service.ts para el mismo patrón.
      data: {
        tipo: dto.tipo,
        // new Date(...), no el string crudo: class-validator@IsDateString
        // acepta fechas sin horario, pero Prisma exige un datetime ISO
        // completo y tira 500 si le llega solo la fecha (bug real,
        // encontrado probando el mismo caso en Obligacion.fechaVencimiento).
        fecha: dto.fecha ? new Date(dto.fecha) : undefined,
        entidadId: dto.entidadId,
        observaciones: limpiarObservaciones(dto.observaciones),
        estado: 'borrador',
        usuarioId,
        detalles: { create: dto.detalles.map(toDetalleData) },
      } as unknown as Prisma.RemitoCreateInput,
      include: INCLUDE_DETALLE,
    });
  }

  async findAll(query: ListRemitosQueryDto) {
    const where: Prisma.RemitoWhereInput = {
      tipo: query.tipo,
      estado: query.estado,
      entidadId: query.entidadId,
    };
    const q = query.q?.trim();
    if (q) {
      where.OR = [
        { numero: { contains: q, mode: 'insensitive' } },
        { entidad: { nombre: { contains: q, mode: 'insensitive' } } },
      ];
    }

    const [rows, total] = await Promise.all([
      this.prisma.db.remito.findMany({
        where,
        include: { entidad: true, detalles: { select: { subtotal: true } } },
        orderBy: { fecha: 'desc' },
        skip: query.skip,
        take: query.take,
      }),
      this.prisma.db.remito.count({ where }),
    ]);

    // Total y cantidad de líneas para el listado, calculados desde los
    // detalles (no hay un campo total guardado en Remito).
    const data = rows.map(({ detalles, ...remito }) => ({
      ...remito,
      lineas: detalles.length,
      total: detalles
        .reduce((acc, d) => acc.add(d.subtotal), new Prisma.Decimal(0))
        .toString(),
    }));

    return { data, total, skip: query.skip, take: query.take };
  }

  async findOne(id: string) {
    const remito = await this.prisma.db.remito.findUnique({
      where: { id },
      include: INCLUDE_DETALLE,
    });

    if (!remito) {
      throw new NotFoundException('Remito no encontrado');
    }

    return remito;
  }

  async update(id: string, dto: UpdateRemitoDto) {
    const remito = await this.findOne(id);

    if (remito.estado !== 'borrador') {
      throw new ConflictException(
        'Solo se puede editar un remito en estado borrador',
      );
    }

    if (dto.entidadId) {
      await this.assertEntidadExists(dto.entidadId);
    }
    if (dto.detalles) {
      await this.assertProductosExist(dto.detalles);
    }

    await this.prisma.db.$transaction(async (tx) => {
      await tx.remito.update({
        where: { id },
        data: {
          tipo: dto.tipo,
          fecha: dto.fecha ? new Date(dto.fecha) : undefined,
          entidadId: dto.entidadId,
          // undefined = no tocar; "" (o solo espacios) = borrar.
          observaciones:
            dto.observaciones === undefined ? undefined : limpiarObservaciones(dto.observaciones),
        },
      });

      if (dto.detalles) {
        await tx.detalleRemito.deleteMany({ where: { remitoId: id } });
        await tx.detalleRemito.createMany({
          data: dto.detalles.map((d) => ({ remitoId: id, ...toDetalleData(d) })),
        });
      }
    });

    return this.findOne(id);
  }

  /**
   * Al emitir, si el remito tiene entidad, genera automáticamente la
   * Obligación que asienta el movimiento en la cuenta corriente de esa
   * entidad -- pedido explícito de Martín: un remito emitido tiene que
   * quedar reflejado en la cuenta corriente sin tener que cargar la
   * obligación a mano por separado. Todo en una sola transacción: si falla
   * la obligación, el remito tampoco queda emitido.
   *
   * Dirección según tipo de remito: "S" (salida, le entregamos algo a la
   * entidad) => la entidad nos debe (a_cobrar). "E" (entrada, la entidad nos
   * entrega algo) => nosotros le debemos (a_pagar). Remitos sin entidadId no
   * generan nada (no hay a quién asignarle el movimiento).
   */
  async emitir(id: string, usuarioId?: string) {
    const remito = await this.findOne(id);

    if (remito.estado !== 'borrador') {
      throw new ConflictException(
        'Solo se puede emitir un remito en estado borrador',
      );
    }
    if (remito.detalles.length === 0) {
      throw new BadRequestException('No se puede emitir un remito sin detalles');
    }
    // Decisión de Martín (entrega 19): un borrador puede no tener entidad,
    // pero todo remito emitido tiene que quedar asentado en una cuenta
    // corriente. Los emitidos viejos sin entidad quedan como están.
    if (!remito.entidadId) {
      throw new BadRequestException('Elegí a quién va el remito antes de emitirlo');
    }

    return this.prisma.db.$transaction(async (tx) => {
      const numero = await siguienteNumeroRemito(tx);

      // updateMany con estado 'borrador' en el where: si otra request emitió
      // este mismo remito entre el findOne de arriba y acá, no se pisa --
      // se corta y la transacción revierte también el número tomado.
      const { count } = await tx.remito.updateMany({
        where: { id, estado: 'borrador' },
        data: { estado: 'emitido', numero },
      });
      if (count === 0) {
        throw new ConflictException('Solo se puede emitir un remito en estado borrador');
      }

      if (remito.entidadId) {
        const total = remito.detalles.reduce((sum, d) => sum + d.subtotal.toNumber(), 0);

        await this.obligacionesService.createWithinTx(
          tx,
          {
            entidadId: remito.entidadId,
            monto: total,
            tipo: remito.tipo === 'S' ? 'venta' : 'compra',
            descripcion: `Remito ${numero}`,
            direccion: remito.tipo === 'S' ? 'a_cobrar' : 'a_pagar',
            remitoId: remito.id,
          },
          usuarioId,
        );
      }

      // Se relee con `tx` (no this.findOne, que usaría una conexión fuera
      // de la transacción) para traer la obligación recién creada -- el
      // primer update de arriba se hizo antes de que existiera todavía.
      return tx.remito.findUniqueOrThrow({ where: { id }, include: INCLUDE_DETALLE });
    });
  }

  /**
   * Si el remito tiene una obligación generada automáticamente (ver
   * emitir()) y todavía no tiene pagos aplicados, se anula junto con el
   * remito (revierte el movimiento en la cuenta corriente). Si ya tiene
   * pagos aplicados, se bloquea -- mismo criterio que ya usa
   * ObligacionesService.anular() para no dejar la cuenta corriente
   * inconsistente.
   */
  async anular(id: string, usuarioId?: string) {
    const remito = await this.findOne(id);

    if (remito.estado === 'anulado') {
      throw new ConflictException('El remito ya está anulado');
    }

    const obligacion = remito.obligacionGenerada;
    if (obligacion && obligacion.estado !== 'anulada') {
      const montoPagado = obligacion.aplicaciones.reduce(
        (sum, a) => sum + a.monto.toNumber(),
        0,
      );
      if (montoPagado > 0) {
        throw new ConflictException(
          'No se puede anular: el remito ya tiene pagos aplicados en la cuenta corriente',
        );
      }
    }

    return this.prisma.db.$transaction(async (tx) => {
      await tx.remito.update({ where: { id }, data: { estado: 'anulado' } });

      if (obligacion && obligacion.estado !== 'anulada') {
        await this.obligacionesService.anularWithinTx(tx, obligacion.id, usuarioId);
      }

      // Mismo motivo que en emitir(): tx, no this.findOne, para leer dentro
      // de la misma transacción el estado ya actualizado.
      return tx.remito.findUniqueOrThrow({ where: { id }, include: INCLUDE_DETALLE });
    });
  }

  /**
   * Borrado físico, solo de borradores (decisión de Martín, entrega 19: el
   * borrador se autoguarda, y "Descartar" tiene que poder borrarlo sin dejar
   * un anulado en el listado). Un borrador no tiene número ni movimientos en
   * la cuenta corriente, así que no se pierde trazabilidad; el borrado queda
   * igual en la auditoría (AuditInterceptor). Emitidos y anulados siguen sin
   * poder borrarse: para eso está anular.
   */
  async eliminarBorrador(id: string) {
    const { count } = await this.prisma.db.remito.deleteMany({
      where: { id, estado: 'borrador' },
    });
    if (count === 0) {
      await this.findOne(id); // 404 si no existe (o es de otra empresa)
      throw new ConflictException('Solo se puede descartar un remito en borrador');
    }
    return { id, eliminado: true };
  }

  async generatePdf(id: string): Promise<Buffer> {
    const remito = await this.findOne(id);
    // Empresa no es tenant-scoped (es el tenant): se busca por el empresaId
    // del remito, que ya pasó el filtro de la extensión en findOne.
    const empresa = await this.prisma.db.empresa.findUniqueOrThrow({
      where: { id: remito.empresaId },
      select: { nombre: true, cuit: true },
    });
    return buildRemitoPdf(remito, empresa);
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

  /**
   * productoId viaja en el body (dentro de cada línea de detalle) -- mismo
   * gap potencial que unidadMedidaId en Productos: sin este chequeo, nada
   * impide referenciar un producto de otra empresa. También exige que esté
   * activo: un producto dado de baja no debería poder entrar en un remito
   * nuevo (se encontró probando -- no era el comportamiento esperado).
   */
  private async assertProductosExist(detalles: CreateDetalleRemitoDto[]) {
    const ids = [...new Set(detalles.map((d) => d.productoId))];
    const encontrados = await this.prisma.db.producto.findMany({
      where: { id: { in: ids }, activo: true },
      select: { id: true },
    });

    if (encontrados.length !== ids.length) {
      throw new BadRequestException(
        'Uno o más productoId son inválidos, están dados de baja, o no pertenecen a esta empresa',
      );
    }
  }
}

function limpiarObservaciones(texto?: string): string | null {
  const t = texto?.trim();
  return t ? t : null;
}

function toDetalleData(d: CreateDetalleRemitoDto) {
  return {
    productoId: d.productoId,
    cantidad: d.cantidad,
    precioUnitario: d.precioUnitario,
    subtotal: d.cantidad * d.precioUnitario,
  };
}

// Punto de venta fijo mientras haya una sola sucursal (ver modelo Numerador).
const PUNTO_VENTA_REMITOS = 1;

/**
 * Toma el próximo número de remito de la empresa actual, "0001-00000015".
 * Un solo INSERT ... ON CONFLICT DO UPDATE: Postgres bloquea la fila del
 * numerador hasta que termina la transacción, así que dos emisiones
 * simultáneas nunca toman el mismo número, y si la emisión falla el
 * incremento se revierte con el resto (no quedan huecos).
 *
 * SQL crudo: la extensión de tenant no aplica acá, por eso empresaId se toma
 * explícitamente del contexto (fail-closed igual que la extensión).
 */
async function siguienteNumeroRemito(
  tx: Pick<Prisma.TransactionClient, '$queryRaw'>,
): Promise<string> {
  const empresaId = TenantContext.getEmpresaId();
  if (!empresaId) {
    throw new Error('TenantContext sin empresaId al numerar un remito');
  }

  const [{ ultimoNumero }] = await tx.$queryRaw<{ ultimoNumero: number }[]>`
    INSERT INTO "Numerador" ("id", "empresaId", "tipoComprobante", "puntoVenta", "ultimoNumero")
    VALUES (gen_random_uuid()::text, ${empresaId}, 'remito', ${PUNTO_VENTA_REMITOS}, 1)
    ON CONFLICT ("empresaId", "tipoComprobante", "puntoVenta")
    DO UPDATE SET "ultimoNumero" = "Numerador"."ultimoNumero" + 1
    RETURNING "ultimoNumero"`;

  return `${String(PUNTO_VENTA_REMITOS).padStart(4, '0')}-${String(ultimoNumero).padStart(8, '0')}`;
}
