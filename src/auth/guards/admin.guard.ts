import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';

/**
 * Gate mínimo para operaciones de administración (ej. resetear password de
 * otro usuario). Reutiliza el catálogo Rol/UsuarioRol que ya está en el
 * schema -- no es el sistema de permisos granulares de GESTIOYA.md sección
 * 51 (RBAC completo sigue como decisión pendiente), es solo un chequeo de
 * "¿tiene el rol admin?" para destrabar este único caso de uso del MVP.
 */
@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();

    if (!req.user) {
      throw new UnauthorizedException();
    }

    if (!req.user.roles.includes('admin')) {
      throw new ForbiddenException('Requiere rol admin');
    }

    return true;
  }
}
