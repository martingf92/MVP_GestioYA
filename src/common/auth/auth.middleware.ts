import { Injectable, NestMiddleware } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { NextFunction, Request, Response } from 'express';
import { JwtPayload } from './jwt-payload';

/**
 * Verifica el access token y puebla req.user. Va ANTES que TenantMiddleware
 * en la cadena (ver AppModule#configure): en NestJS el middleware corre
 * antes que los Guards, así que la verificación del JWT tiene que resolverse
 * acá -- un Guard no llega a tiempo para que TenantContext.run() envuelva el
 * resto de la request.
 *
 * Si no hay token o es inválido, simplemente no setea req.user y sigue
 * (fail-open a nivel middleware); es JwtAuthGuard quien decide, por ruta,
 * si la ausencia de req.user debe cortar con 401.
 */
@Injectable()
export class AuthMiddleware implements NestMiddleware {
  constructor(private readonly jwtService: JwtService) {}

  use(req: Request, res: Response, next: NextFunction) {
    const header = req.headers.authorization;
    const token = header?.startsWith('Bearer ') ? header.slice(7) : undefined;

    if (token) {
      try {
        const payload = this.jwtService.verify<JwtPayload>(token);
        req.user = {
          userId: payload.sub,
          empresaId: payload.empresaId,
          roles: payload.roles,
        };
      } catch {
        // Token inválido o vencido: req.user queda sin setear.
      }
    }

    next();
  }
}
