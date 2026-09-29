import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductoDto } from './dto/create-producto.dto';
import { UpdateProductoDto } from './dto/update-producto.dto';
import { ListProductosQueryDto } from './dto/list-productos-query.dto';

function isUniqueViolation(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002'
  );
}

function isNotFound(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2025'
  );
}

/**
 * SKU vacío => null. Con "" guardado, dos productos sin SKU chocarían contra
 * @@unique([empresaId, sku]); null no choca con otro null (mismo criterio que
 * Entidad.documentoNro, entrega 4).
 */
function normalizarSku(sku?: string): string | null {
  const s = sku?.trim();
  return s ? s : null;
}

@Injectable()
export class ProductosService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateProductoDto) {
    await this.assertUnidadMedidaExists(dto.unidadMedidaId);

    try {
      return await this.prisma.db.producto.create({
        // empresaId lo inyecta tenant.extension.ts en runtime, ver
        // entidades.service.ts para el mismo patrón.
        data: { ...dto, sku: normalizarSku(dto.sku) } as unknown as Prisma.ProductoCreateInput,
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException(
          'Ya existe un producto con ese SKU en esta empresa',
        );
      }
      throw error;
    }
  }

  async findAll(query: ListProductosQueryDto) {
    const where: Prisma.ProductoWhereInput = {
      nombre: query.nombre
        ? { contains: query.nombre, mode: 'insensitive' }
        : undefined,
      activo: query.activo,
    };
    const q = query.q?.trim();
    if (q) {
      where.OR = [
        { nombre: { contains: q, mode: 'insensitive' } },
        { sku: { contains: q, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.db.producto.findMany({
        where,
        include: { unidadMedida: true },
        orderBy: { nombre: 'asc' },
        skip: query.skip,
        take: query.take,
      }),
      this.prisma.db.producto.count({ where }),
    ]);

    return { data, total, skip: query.skip, take: query.take };
  }

  async findOne(id: string) {
    const producto = await this.prisma.db.producto.findUnique({
      where: { id },
      include: { unidadMedida: true },
    });

    if (!producto) {
      throw new NotFoundException('Producto no encontrado');
    }

    return producto;
  }

  async update(id: string, dto: UpdateProductoDto) {
    if (dto.unidadMedidaId) {
      await this.assertUnidadMedidaExists(dto.unidadMedidaId);
    }

    try {
      return await this.prisma.db.producto.update({
        where: { id },
        data: { ...dto, sku: dto.sku === undefined ? undefined : normalizarSku(dto.sku) },
      });
    } catch (error) {
      if (isNotFound(error)) {
        throw new NotFoundException('Producto no encontrado');
      }
      if (isUniqueViolation(error)) {
        throw new ConflictException(
          'Ya existe un producto con ese SKU en esta empresa',
        );
      }
      throw error;
    }
  }

  async remove(id: string) {
    try {
      await this.prisma.db.producto.update({
        where: { id },
        data: { activo: false },
      });
    } catch (error) {
      if (isNotFound(error)) {
        throw new NotFoundException('Producto no encontrado');
      }
      throw error;
    }
  }

  /**
   * unidadMedidaId viaja en el body, no en la URL -- nada impide de por sí
   * que apunte a una UnidadMedida de otra empresa (la FK de Postgres no
   * sabe de tenants). Este chequeo usa `db.unidadMedida` (tenant-scoped)
   * para confirmar que pertenece a la empresa actual antes de usarla.
   */
  private async assertUnidadMedidaExists(unidadMedidaId: string) {
    const unidad = await this.prisma.db.unidadMedida.findUnique({
      where: { id: unidadMedidaId },
    });

    if (!unidad) {
      throw new BadRequestException(
        'unidadMedidaId inválido o no pertenece a esta empresa',
      );
    }
  }
}
