import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { TenantContext } from './tenant-context';

/**
 * IMPORTANTE - estado: preparado, todavía no conectado.
 *
 * Este middleware asume que ya corrió un guard de autenticación (JWT) que
 * dejó `req.user.empresaId` disponible. Ese guard todavía no existe -- es
 * el siguiente paso lógico (módulo de Auth). Hasta que se conecte:
 *
 *   - Si no hay req.user, la request sigue sin tenant en contexto.
 *   - Cualquier query sobre un modelo tenant-scoped va a fallar con el
 *     error explícito que tira tenant.extension.ts (fail-closed a propósito:
 *     mejor un error visible ahora que una fuga de datos silenciosa después).
 *
 * Registrar en main.ts o en un módulo global, DESPUÉS del guard de auth:
 *   app.use(new TenantMiddleware().use.bind(new TenantMiddleware()));
 * o, dentro de un NestModule con configure(), aplicado a las rutas
 * protegidas una vez que exista el AuthModule.
 */
@Injectable()
export class TenantMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const empresaId = (req as any).user?.empresaId;

    if (empresaId) {
      TenantContext.run(empresaId, () => next());
    } else {
      next();
    }
  }
}
