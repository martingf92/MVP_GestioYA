import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEntidadDto } from './dto/create-entidad.dto';
import { UpdateEntidadDto } from './dto/update-entidad.dto';
import { ListEntidadesQueryDto } from './dto/list-entidades-query.dto';
import { CreateClienteDto } from './dto/create-cliente.dto';
import { CreateProveedorDto } from './dto/create-proveedor.dto';
import { CreateAcreedorDto } from './dto/create-acreedor.dto';

const INCLUDE_SUBTIPOS = {
  cliente: true,
  proveedor: true,
  acreedor: true,
  // Para el listado con saldo (pantalla de Entidades): saldo actual +
  // fecha del último movimiento, en la misma consulta (sin N+1). Se
  // computa el saldo real, no se confía en un campo aparte que se pudiera
  // desincronizar -- mismo criterio que ya usa el módulo de Cuentas.
  cuentaCorriente: {
    select: {
      saldoActual: true,
      movimientos: { orderBy: { fecha: 'desc' as const }, take: 1, select: { fecha: true } },
    },
  },
} as const;

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

// '' y undefined deben tratarse igual ("sin documento cargado"): si se
// guardara '' literal, dos entidades sin documento chocarían contra el
// @@unique([empresaId, documentoNro]) del schema (NULL sí puede repetirse,
// '' no).
function normalizeDocumentoNro(value: string | undefined): string | undefined {
  return value === '' ? undefined : value;
}

@Injectable()
export class EntidadesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateEntidadDto) {
    try {
      return await this.prisma.db.entidad.create({
        // empresaId lo inyecta tenant.extension.ts en runtime -- el tipo
        // generado por Prisma no lo sabe y exige `empresaId` o `empresa`
        // acá, por eso el cast. Mismo escape hatch que usa la extensión.
        data: {
          nombre: dto.nombre,
          documentoTipo: dto.documentoTipo,
          documentoNro: normalizeDocumentoNro(dto.documentoNro),
          email: dto.email,
          telefono: dto.telefono,
          direccion: dto.direccion,
          cliente: dto.cliente ? { create: dto.cliente } : undefined,
          proveedor: dto.proveedor ? { create: dto.proveedor } : undefined,
          acreedor: dto.acreedor ? { create: dto.acreedor } : undefined,
        } as unknown as Prisma.EntidadCreateInput,
        include: INCLUDE_SUBTIPOS,
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException(
          'Ya existe una entidad con ese número de documento en esta empresa',
        );
      }
      throw error;
    }
  }

  async findAll(query: ListEntidadesQueryDto) {
    const where: Prisma.EntidadWhereInput = {
      nombre: query.nombre
        ? { contains: query.nombre, mode: 'insensitive' }
        : undefined,
      activo: query.activo,
      cliente: query.tipo === 'cliente' ? { isNot: null } : undefined,
      proveedor: query.tipo === 'proveedor' ? { isNot: null } : undefined,
      acreedor: query.tipo === 'acreedor' ? { isNot: null } : undefined,
    };

    const total = await this.prisma.db.entidad.count({ where });

    if (query.orderBy === 'saldo') {
      // Ordenar por saldo a nivel de Postgres a través de la relación
      // dejaría las entidades sin CuentaCorriente todavía (saldo NULL)
      // primero en orden descendente (comportamiento default de Postgres:
      // NULLS FIRST en DESC) -- no tiene sentido para el usuario, una
      // entidad sin movimientos tiene saldo 0, no "más" que las demás. Se
      // ordena en memoria tratando null como 0. A la escala de una PyME
      // (cientos de entidades, no millones) esto es más simple y correcto
      // que pelear con NULLS FIRST/LAST de Postgres a través de una
      // relación -- si el volumen creciera mucho, ahí sí valdría la pena
      // resolverlo con SQL crudo.
      const todas = await this.prisma.db.entidad.findMany({ where, include: INCLUDE_SUBTIPOS });
      const signo = query.orderDir === 'asc' ? 1 : -1;
      todas.sort((a, b) => {
        const saldoA = a.cuentaCorriente?.saldoActual.toNumber() ?? 0;
        const saldoB = b.cuentaCorriente?.saldoActual.toNumber() ?? 0;
        return signo * (saldoA - saldoB);
      });
      const data = todas.slice(query.skip, (query.skip ?? 0) + (query.take ?? todas.length));
      return { data, total, skip: query.skip, take: query.take };
    }

    const data = await this.prisma.db.entidad.findMany({
      where,
      include: INCLUDE_SUBTIPOS,
      orderBy: { nombre: query.orderDir === 'desc' ? 'desc' : 'asc' },
      skip: query.skip,
      take: query.take,
    });

    return { data, total, skip: query.skip, take: query.take };
  }

  async findOne(id: string) {
    const entidad = await this.prisma.db.entidad.findUnique({
      where: { id },
      include: INCLUDE_SUBTIPOS,
    });

    if (!entidad) {
      throw new NotFoundException('Entidad no encontrada');
    }

    return entidad;
  }

  async update(id: string, dto: UpdateEntidadDto) {
    try {
      return await this.prisma.db.entidad.update({
        where: { id },
        data: {
          ...dto,
          documentoNro: normalizeDocumentoNro(dto.documentoNro),
        },
        include: INCLUDE_SUBTIPOS,
      });
    } catch (error) {
      if (isNotFound(error)) {
        throw new NotFoundException('Entidad no encontrada');
      }
      if (isUniqueViolation(error)) {
        throw new ConflictException(
          'Ya existe una entidad con ese número de documento en esta empresa',
        );
      }
      throw error;
    }
  }

  async remove(id: string) {
    try {
      await this.prisma.db.entidad.update({
        where: { id },
        data: { activo: false },
      });
    } catch (error) {
      if (isNotFound(error)) {
        throw new NotFoundException('Entidad no encontrada');
      }
      throw error;
    }
  }

  async upsertCliente(entidadId: string, dto: CreateClienteDto) {
    await this.assertEntidadExists(entidadId);

    return this.prisma.db.cliente.upsert({
      where: { entidadId },
      create: { entidadId, ...dto },
      update: dto,
    });
  }

  async removeCliente(entidadId: string) {
    await this.assertEntidadExists(entidadId);

    try {
      await this.prisma.db.cliente.delete({ where: { entidadId } });
    } catch (error) {
      if (isNotFound(error)) {
        throw new NotFoundException('Esta entidad no tiene datos de cliente');
      }
      throw error;
    }
  }

  async upsertProveedor(entidadId: string, dto: CreateProveedorDto) {
    await this.assertEntidadExists(entidadId);

    return this.prisma.db.proveedor.upsert({
      where: { entidadId },
      create: { entidadId, ...dto },
      update: dto,
    });
  }

  async removeProveedor(entidadId: string) {
    await this.assertEntidadExists(entidadId);

    try {
      await this.prisma.db.proveedor.delete({ where: { entidadId } });
    } catch (error) {
      if (isNotFound(error)) {
        throw new NotFoundException('Esta entidad no tiene datos de proveedor');
      }
      throw error;
    }
  }

  async upsertAcreedor(entidadId: string, dto: CreateAcreedorDto) {
    await this.assertEntidadExists(entidadId);

    return this.prisma.db.acreedor.upsert({
      where: { entidadId },
      create: { entidadId, ...dto },
      update: dto,
    });
  }

  async removeAcreedor(entidadId: string) {
    await this.assertEntidadExists(entidadId);

    try {
      await this.prisma.db.acreedor.delete({ where: { entidadId } });
    } catch (error) {
      if (isNotFound(error)) {
        throw new NotFoundException('Esta entidad no tiene datos de acreedor');
      }
      throw error;
    }
  }

  /**
   * Cliente/Proveedor no tienen empresaId propio y no están en el allowlist
   * de tenant.extension.ts (no aplica, ver comentario ahí) -- una query
   * directa por entidadId no queda aislada por tenant sola. Este chequeo
   * usa `db.entidad` (sí tenant-scoped) para confirmar que la entidad es de
   * la empresa actual antes de tocar su cliente/proveedor.
   */
  private async assertEntidadExists(entidadId: string) {
    const entidad = await this.prisma.db.entidad.findUnique({
      where: { id: entidadId },
    });

    if (!entidad) {
      throw new NotFoundException('Entidad no encontrada');
    }

    return entidad;
  }
}
