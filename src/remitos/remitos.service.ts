import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRemitoDto } from './dto/create-remito.dto';
import { UpdateRemitoDto } from './dto/update-remito.dto';
import { ListRemitosQueryDto } from './dto/list-remitos-query.dto';
import { CreateDetalleRemitoDto } from './dto/create-detalle-remito.dto';

const INCLUDE_DETALLE = {
  detalles: { include: { producto: true } },
  entidad: true,
} as const;

@Injectable()
export class RemitosService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateRemitoDto, usuarioId: string) {
    if (dto.entidadId) {
      await this.assertEntidadExists(dto.entidadId);
    }
    await this.assertProductosExist(dto.detalles);

    return this.prisma.db.remito.create({
      // empresaId lo inyecta tenant.extension.ts en runtime, ver
      // entidades.service.ts para el mismo patrón.
      data: {
        numero: dto.numero,
        tipo: dto.tipo,
        fecha: dto.fecha,
        entidadId: dto.entidadId,
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

    const [data, total] = await Promise.all([
      this.prisma.db.remito.findMany({
        where,
        include: { entidad: true },
        orderBy: { fecha: 'desc' },
        skip: query.skip,
        take: query.take,
      }),
      this.prisma.db.remito.count({ where }),
    ]);

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
          numero: dto.numero,
          tipo: dto.tipo,
          fecha: dto.fecha,
          entidadId: dto.entidadId,
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

  async emitir(id: string) {
    const remito = await this.findOne(id);

    if (remito.estado !== 'borrador') {
      throw new ConflictException(
        'Solo se puede emitir un remito en estado borrador',
      );
    }
    if (remito.detalles.length === 0) {
      throw new BadRequestException('No se puede emitir un remito sin detalles');
    }

    return this.prisma.db.remito.update({
      where: { id },
      data: { estado: 'emitido' },
      include: INCLUDE_DETALLE,
    });
  }

  async anular(id: string) {
    const remito = await this.findOne(id);

    if (remito.estado === 'anulado') {
      throw new ConflictException('El remito ya está anulado');
    }

    return this.prisma.db.remito.update({
      where: { id },
      data: { estado: 'anulado' },
      include: INCLUDE_DETALLE,
    });
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

function toDetalleData(d: CreateDetalleRemitoDto) {
  return {
    productoId: d.productoId,
    cantidad: d.cantidad,
    precioUnitario: d.precioUnitario,
    subtotal: d.cantidad * d.precioUnitario,
  };
}
