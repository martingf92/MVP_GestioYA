import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Request } from 'express';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

const ACCION_POR_METODO: Record<string, string> = {
  POST: 'crear',
  PUT: 'actualizar',
  PATCH: 'actualizar',
  DELETE: 'eliminar',
};

// Rutas de sesión -- no son cambios de datos de negocio, se excluyen para no
// ensuciar la auditoría. auth/usuarios/:id/password SÍ se audita (acción
// administrativa real sobre un usuario) -- no está en esta lista a propósito.
const RUTAS_EXCLUIDAS = [/^\/auth\/login$/, /^\/auth\/refresh$/, /^\/auth\/logout$/];

const CLAVES_SENSIBLES = ['password', 'token', 'accessToken', 'refreshToken', 'secret'];

function redactar(body: unknown): unknown {
  if (!body || typeof body !== 'object') return body;
  const copia: Record<string, unknown> = { ...(body as Record<string, unknown>) };
  for (const clave of CLAVES_SENSIBLES) {
    if (clave in copia) copia[clave] = '[REDACTADO]';
  }
  return copia;
}

/**
 * Registra en LogAccion cada request que modificó datos de negocio (pedido
 * de Martín, ver GESTIOYA.md sección 18). Guarda "qué se pidió cambiar" (el
 * body de la request, redactando campos sensibles) en vez de un diff
 * campo-por-campo real: cubre los 5 módulos + Auth de una sola vez sin tener
 * que tocar cada service, a costa de ser menos preciso si un PATCH cambia
 * solo 1 de varios campos (decisión tomada con Martín).
 */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<Request>();
    const accion = ACCION_POR_METODO[req.method];

    if (!accion || RUTAS_EXCLUIDAS.some((re) => re.test(req.path))) {
      return next.handle();
    }

    return next.handle().pipe(
      tap((responseBody) => {
        // Solo se audita si la request terminó bien (tap no corre en error)
        // -- un intento fallido no es un cambio real. Fire-and-forget: la
        // auditoría nunca debe demorar ni romper la respuesta ya enviada al
        // cliente. Si falla, se pierde en silencio (ver LogError para
        // errores técnicos de la aplicación).
        this.registrar(req, accion, responseBody).catch(() => undefined);
      }),
    );
  }

  private async registrar(req: Request, accion: string, responseBody: unknown) {
    const tabla = req.path.split('/').filter(Boolean)[0] ?? 'desconocida';
    const registroId =
      req.params?.id ?? (responseBody as { id?: string } | undefined)?.id ?? 'desconocido';

    await this.prisma.db.logAccion.create({
      // empresaId lo inyecta tenant.extension.ts en runtime, ver
      // entidades.service.ts para el mismo patrón.
      data: {
        tabla,
        registroId,
        accion,
        usuarioId: req.user?.userId,
        diffJson: redactar(req.body) as Prisma.InputJsonValue,
      } as unknown as Prisma.LogAccionCreateInput,
    });
  }
}
