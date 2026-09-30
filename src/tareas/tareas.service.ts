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

const ESTADOS_PENDIENTES = ['abierta', 'en_proceso'];
const RANGO_PRIORIDAD: Record<string, number> = { alta: 0, normal: 1, baja: 2 };

/**
 * Dentro de un mismo día de vencimiento, primero las de prioridad alta. Se
 * ordena en memoria (dentro de la página): en la base la prioridad es texto
 * y ordenada alfabéticamente quedaría alta < baja < normal.
 */
function ordenarPorPrioridad<T extends { fechaVencimiento: Date | null; prioridad: string | null }>(
  tareas: T[],
): T[] {
  const dia = (d: Date | null) =>
    d ? d.toLocaleDateString('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' }) : '~';
  const rango = (p: string | null) => RANGO_PRIORIDAD[p ?? 'normal'] ?? 1;
  return tareas
    .map((t, i) => ({ t, i }))
    .sort(
      (a, b) =>
        dia(a.t.fechaVencimiento).localeCompare(dia(b.t.fechaVencimiento)) ||
        rango(a.t.prioridad) - rango(b.t.prioridad) ||
        a.i - b.i,
    )
    .map(({ t }) => t);
}

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
    const pendientes = query.estado === 'pendientes' || query.vencidas;
    const where: Prisma.TareaWhereInput = {
      estado: pendientes ? { in: ESTADOS_PENDIENTES } : query.estado,
      entidadId: query.entidadId,
      usuarioResponsableId: query.usuarioResponsableId,
      // Mismo criterio que `vencida` en withComputed().
      fechaVencimiento: query.vencidas ? { lt: new Date() } : undefined,
    };

    const [data, total] = await Promise.all([
      this.prisma.db.tarea.findMany({
        where,
        include: INCLUDE_TAREA,
        // Sin vencimiento, al final.
        orderBy: [{ fechaVencimiento: { sort: 'asc', nulls: 'last' } }, { titulo: 'asc' }],
        skip: query.skip,
        take: query.take,
      }),
      this.prisma.db.tarea.count({ where }),
    ]);

    return {
      data: ordenarPorPrioridad(data).map(withComputed),
      total,
      skip: query.skip,
      take: query.take,
    };
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
      await this.prisma.db.$transaction(async (tx) => {
        await tx.tarea.update({
          where: { id },
          data: {
            titulo: dto.titulo,
            descripcion: dto.descripcion,
            entidadId: dto.entidadId,
            // null saca el vencimiento; undefined no lo toca.
            fechaVencimiento:
              dto.fechaVencimiento === undefined
                ? undefined
                : dto.fechaVencimiento === null
                  ? null
                  : new Date(dto.fechaVencimiento),
            prioridad: dto.prioridad,
            usuarioResponsableId: dto.usuarioResponsableId,
            estado: dto.estado,
          },
        });

        // Recordatorio "app": se reemplaza el pendiente (uno por tarea desde
        // la UI). Los ya vistos quedan como historial. Notificacion no es
        // tenant-scoped, pero la tarea ya se validó arriba (update filtrado).
        if (dto.recordatorio !== undefined) {
          await tx.notificacion.deleteMany({
            where: { tareaId: id, canal: 'app', estado: 'pendiente' },
          });
          if (dto.recordatorio !== null) {
            await tx.notificacion.create({
              data: { tareaId: id, canal: 'app', fechaProgramada: new Date(dto.recordatorio) },
            });
          }
        }
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
      // Una tarea cumplida ya no necesita recordatorio.
      where: { estado: { in: ESTADOS_PENDIENTES }, notificaciones: { some: filtroNotificacion } },
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

  /**
   * "Listo" en el aviso: el recordatorio "app" pasa a `enviada` (para el
   * canal app, mostrarlo y que la persona lo vea es la entrega) y deja de
   * aparecer. Notificacion no es tenant-scoped: se valida vía la tarea.
   */
  async marcarRecordatorioVisto(notificacionId: string) {
    const tarea = await this.prisma.db.tarea.findFirst({
      where: { notificaciones: { some: { id: notificacionId } } },
      select: { id: true },
    });
    if (!tarea) {
      throw new NotFoundException('Recordatorio no encontrado');
    }
    await this.prisma.db.notificacion.update({
      where: { id: notificacionId },
      data: { estado: 'enviada', fechaEnviada: new Date() },
    });
    return { notificacionId, visto: true };
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
