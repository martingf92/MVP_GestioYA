import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUnidadMedidaDto } from './dto/create-unidad-medida.dto';
import { UpdateUnidadMedidaDto } from './dto/update-unidad-medida.dto';

const CODIGO_REPETIDO = 'Ya existe una unidad de medida con ese código en esta empresa';

function esCodigoRepetido(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
}

@Injectable()
export class UnidadesMedidaService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateUnidadMedidaDto) {
    try {
      return await this.prisma.db.unidadMedida.create({
        // empresaId lo inyecta tenant.extension.ts en runtime, ver
        // entidades.service.ts para el mismo patrón.
        data: {
          ...dto,
          codigo: dto.codigo.trim(),
          descripcion: dto.descripcion.trim(),
        } as unknown as Prisma.UnidadMedidaCreateInput,
      });
    } catch (error) {
      if (esCodigoRepetido(error)) throw new ConflictException(CODIGO_REPETIDO);
      throw error;
    }
  }

  /**
   * Con la cantidad de productos que usan cada unidad: la pantalla la
   * muestra y no ofrece borrar una unidad en uso (la FK lo bloquea igual).
   * Cuenta también productos dados de baja, porque también la referencian.
   */
  findAll() {
    return this.prisma.db.unidadMedida.findMany({
      orderBy: { codigo: 'asc' },
      include: { _count: { select: { productos: true } } },
    });
  }

  /**
   * Renombrar el código se ve en todos lados, incluso en remitos viejos
   * (las líneas apuntan a la unidad, no guardan el texto): sirve para
   * corregir un error de tipeo, no para cambiar de unidad.
   */
  async update(id: string, dto: UpdateUnidadMedidaDto) {
    try {
      return await this.prisma.db.unidadMedida.update({
        where: { id },
        data: {
          codigo: dto.codigo?.trim(),
          descripcion: dto.descripcion?.trim(),
        },
        include: { _count: { select: { productos: true } } },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new NotFoundException('Unidad de medida no encontrada');
      }
      if (esCodigoRepetido(error)) throw new ConflictException(CODIGO_REPETIDO);
      throw error;
    }
  }

  async remove(id: string) {
    try {
      await this.prisma.db.unidadMedida.delete({ where: { id } });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new NotFoundException('Unidad de medida no encontrada');
        }
        if (error.code === 'P2003') {
          throw new ConflictException(
            'No se puede eliminar: hay productos que usan esta unidad de medida',
          );
        }
      }
      throw error;
    }
  }
}
