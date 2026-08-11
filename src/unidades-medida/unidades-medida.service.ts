import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUnidadMedidaDto } from './dto/create-unidad-medida.dto';

@Injectable()
export class UnidadesMedidaService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateUnidadMedidaDto) {
    try {
      return await this.prisma.db.unidadMedida.create({
        // empresaId lo inyecta tenant.extension.ts en runtime, ver
        // entidades.service.ts para el mismo patrón.
        data: { ...dto } as unknown as Prisma.UnidadMedidaCreateInput,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'Ya existe una unidad de medida con ese código en esta empresa',
        );
      }
      throw error;
    }
  }

  findAll() {
    return this.prisma.db.unidadMedida.findMany({
      orderBy: { codigo: 'asc' },
    });
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
