import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Reemplaza el manejo de excepciones default de Nest (@Catch() sin
 * argumentos = todas). Mantiene exactamente el mismo formato de respuesta
 * que ya tenía la app (para no romper el frontend ni nada que dependa de
 * `{statusCode, message}`), pero además persiste en LogError los errores
 * técnicos reales (5xx) -- un 400/404/409 es una respuesta esperada del
 * negocio (DTOs de validación, ConflictException, etc.), no un error de la
 * aplicación, así que no se guarda (evita ensuciar la tabla con "ruido"
 * cada vez que alguien manda un dato inválido).
 */
@Catch()
export class ErrorLogFilter implements ExceptionFilter {
  constructor(private readonly prisma: PrismaService) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const req = ctx.getRequest<Request>();
    const res = ctx.getResponse<Response>();

    const esHttpException = exception instanceof HttpException;
    const status = esHttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    const body = esHttpException
      ? exception.getResponse()
      : { statusCode: status, message: 'Internal server error' };

    if (status >= 500) {
      const mensaje = exception instanceof Error ? exception.message : String(exception);
      const stack = exception instanceof Error ? exception.stack : undefined;

      // prisma.raw (sin filtro de tenant), ver comentario en LogError del
      // schema: un 500 puede pasar antes de que exista empresaId en
      // contexto, o justamente porque el contexto de tenant falló. Ídem
      // AuditInterceptor: fire-and-forget, nunca puede romper la respuesta
      // de error que ya se le está por mandar al cliente.
      this.prisma.raw.logError
        .create({
          data: {
            empresaId: req.user?.empresaId,
            usuarioId: req.user?.userId,
            metodo: req.method,
            ruta: req.originalUrl ?? req.path,
            statusCode: status,
            mensaje,
            stack,
          },
        })
        .catch(() => undefined);

      console.error(`[${req.method} ${req.originalUrl}]`, exception);
    }

    res.status(status).json(body);
  }
}
