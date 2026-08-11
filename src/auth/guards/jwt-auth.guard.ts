import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';

/**
 * No verifica el token -- eso ya lo hizo AuthMiddleware. Solo corta con 401
 * si req.user no quedó seteado (sin token, token inválido o vencido).
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();

    if (!req.user) {
      throw new UnauthorizedException();
    }

    return true;
  }
}
