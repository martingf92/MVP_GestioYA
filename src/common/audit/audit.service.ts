import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ListAuditoriaQueryDto } from './dto/list-auditoria-query.dto';
import { ListLogsErrorQueryDto } from './dto/list-logs-error-query.dto';

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async findAuditoria(query: ListAuditoriaQueryDto) {
    const where: Prisma.LogAccionWhereInput = {
      tabla: query.tabla,
      usuarioId: query.usuarioId,
    };

    const [data, total] = await Promise.all([
      this.prisma.db.logAccion.findMany({
        where,
        orderBy: { fecha: 'desc' },
        skip: query.skip,
        take: query.take,
      }),
      this.prisma.db.logAccion.count({ where }),
    ]);

    return { data, total, skip: query.skip, take: query.take };
  }

  /**
   * LogError no está en el allowlist de tenant.extension.ts (ver schema.prisma
   * y ErrorLogFilter) -- se filtra acá a mano por la empresa del usuario que
   * consulta, usando prisma.raw. Errores con empresaId null (pasaron antes de
   * que existiera tenant en contexto) no son de ninguna empresa puntual y no
   * se muestran acá -- no le corresponden al admin de una empresa particular.
   */
  async findLogsError(query: ListLogsErrorQueryDto, empresaId: string) {
    const where: Prisma.LogErrorWhereInput = {
      empresaId,
      statusCode: query.statusCode,
    };

    const [data, total] = await Promise.all([
      this.prisma.raw.logError.findMany({
        where,
        orderBy: { fecha: 'desc' },
        skip: query.skip,
        take: query.take,
      }),
      this.prisma.raw.logError.count({ where }),
    ]);

    return { data, total, skip: query.skip, take: query.take };
  }
}
