import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTareaDto } from './dto/create-tarea.dto';
import { UpdateTareaDto } from './dto/update-tarea.dto';
import { ListTareasQueryDto } from './dto/list-tareas-query.dto';

const INCLUDE_TAREA = {
  entidad: true,
  usuarioResponsable: true,
  creadaPorUsuario: true,
  notificaciones: true,
} as const;

type TareaConNotificaciones = Prisma.TareaGetPayload<{ include: typeof INCLUDE_TAREA }>;

function withComputed(t: TareaConNotificaciones) {
  const vencida =
    !!t.fechaVencimiento &&
    t.fechaVencimiento < new Date() &&
    (t.estado === 'abierta' || t.estado === 'en_proceso');
  return { ...t, vencida };
}

@Injectable()
export class TareasService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateTareaDto, usuarioId: string) {
    if (dto.entidadId) {
      await this.assertEntidadExists(dto.entidadId);
    }
    if (dto.usuarioResponsableId) {
      await this.assertUsuarioExists(dto.usuarioResponsableId);
    }

    const tarea = await this.prisma.db.tarea.create({
      // empresaId lo inyecta tenant.extension.ts en runtime, ver
      // entidades.service.ts para el mismo patrón.
      data: {
        titulo: dto.titulo,
        descripcion: dto.descripcion,
        entidadId: dto.entidadId,
        // new Date(...), no el string crudo -- ver el bug documentado en
        // NOTAS.md entrega 10 (Prisma exige datetime ISO completo).
        fechaVencimiento: dto.fechaVencimiento ? new Date(dto.fechaVencimiento) : undefined,
        prioridad: dto.prioridad,
        usuarioResponsableId: dto.usuarioResponsableId,
        creadaPorUsuarioId: usuarioId,
        estado: 'abierta',
        notificaciones: dto.notificaciones
          ? {
              create: dto.notificaciones.map((n) => ({
                canal: n.canal,
                fechaProgramada: new Date(n.fechaProgramada),
              })),
            }
          : undefined,
      } as unknown as Prisma.TareaCreateInput,
      include: INCLUDE_TAREA,
    });

    return withComputed(tarea);
  }

  async findAll(query: ListTareasQueryDto) {
    const where: Prisma.TareaWhereInput = {
      estado: query.estado,
      entidadId: query.entidadId,
      usuarioResponsableId: query.usuarioResponsableId,
    };

    const [data, total] = await Promise.all([
      this.prisma.db.tarea.findMany({
        where,
        include: INCLUDE_TAREA,
        orderBy: { fechaVencimiento: 'asc' },
        skip: query.skip,
        take: query.take,
      }),
      this.prisma.db.tarea.count({ where }),
    ]);

    return { data: data.map(withComputed), total, skip: query.skip, take: query.take };
  }

  async findOne(id: string) {
    const tarea = await this.prisma.db.tarea.findUnique({
      where: { id },
      include: INCLUDE_TAREA,
    });

    if (!tarea) {
      throw new NotFoundException('Tarea no encontrada');
    }

    return withComputed(tarea);
  }

  async update(id: string, dto: UpdateTareaDto) {
    if (dto.entidadId) {
      await this.assertEntidadExists(dto.entidadId);
    }
    if (dto.usuarioResponsableId) {
      await this.assertUsuarioExists(dto.usuarioResponsableId);
    }

    try {
      await this.prisma.db.tarea.update({
        where: { id },
        data: {
          titulo: dto.titulo,
          descripcion: dto.descripcion,
          entidadId: dto.entidadId,
          fechaVencimiento: dto.fechaVencimiento ? new Date(dto.fechaVencimiento) : undefined,
          prioridad: dto.prioridad,
          usuarioResponsableId: dto.usuarioResponsableId,
          estado: dto.estado,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException('Tarea no encontrada');
      }
      throw error;
    }

    return this.findOne(id);
  }

  async remove(id: string) {
    try {
      // Borrado físico real a propósito: una Tarea no es un registro
      // financiero ni de negocio con valor de auditoría (a diferencia de
      // Entidad/Producto/Remito/Obligacion), no amerita baja lógica.
      // Notificacion tiene onDelete: Cascade, se limpia sola.
      await this.prisma.db.tarea.delete({ where: { id } });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException('Tarea no encontrada');
      }
      throw error;
    }
  }

  /**
   * Recordatorios "app" cuya fecha ya llegó y siguen pendientes -- sin
   * motor de jobs (Redis/n8n quedan fuera del stack por ahora, ver
   * CLAUDE.md), esto es lo que le da uso real a las notificaciones hoy: se
   * consultan al entrar a la app, igual que se calcula `vencida`. Se
   * consulta desde `tarea` (sí tenant-scoped) en vez de `notificacion`
   * directamente (no lo está, mismo motivo que Cliente/Proveedor).
   */
  async getRecordatorios() {
    const ahora = new Date();
    const filtroNotificacion = {
      canal: 'app',
      estado: 'pendiente',
      fechaProgramada: { lte: ahora },
    };

    const tareas = await this.prisma.db.tarea.findMany({
      where: { notificaciones: { some: filtroNotificacion } },
      include: { notificaciones: { where: filtroNotificacion } },
    });

    return tareas.flatMap((t) =>
      t.notificaciones.map((n) => ({
        notificacionId: n.id,
        tareaId: t.id,
        titulo: t.titulo,
        fechaProgramada: n.fechaProgramada,
      })),
    );
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

  private async assertUsuarioExists(usuarioId: string) {
    const usuario = await this.prisma.db.usuario.findUnique({
      where: { id: usuarioId },
    });
    if (!usuario || !usuario.activo) {
      throw new BadRequestException(
        'usuarioResponsableId inválido, inactivo, o no pertenece a esta empresa',
      );
    }
  }
}
