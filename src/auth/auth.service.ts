import {
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { createHash, randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from '../common/auth/jwt-payload';

const REFRESH_TOKEN_BYTES = 48;
const REFRESH_TOKEN_DAYS = Number(process.env.JWT_REFRESH_DAYS ?? 30);

function hashRefreshToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async login(email: string, password: string) {
    // Bypasea el filtro de tenant a propósito: todavía no sabemos a qué
    // empresa pertenece este usuario, es justamente lo que estamos por
    // averiguar. Ver comentario en PrismaService.
    const usuario = await this.prisma.raw.usuario.findUnique({
      where: { email },
      include: { empresa: true, roles: { include: { rol: true } } },
    });

    if (!usuario || !usuario.activo || !usuario.empresa.activo) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const passwordValida = await bcrypt.compare(password, usuario.password);
    if (!passwordValida) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const roles = usuario.roles.map((ur) => ur.rol.nombre);
    const accessToken = this.signAccessToken(usuario.id, usuario.empresaId, roles);
    const refreshToken = await this.issueRefreshToken(usuario.id);

    return {
      accessToken,
      refreshToken,
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        email: usuario.email,
        empresaId: usuario.empresaId,
        roles,
      },
    };
  }

  async refresh(refreshToken: string) {
    const tokenHash = hashRefreshToken(refreshToken);

    // Igual que en login: todavía no hay empresaId en contexto acá, se usa
    // el cliente sin filtro.
    const stored = await this.prisma.raw.refreshToken.findUnique({
      where: { tokenHash },
      include: { usuario: { include: { roles: { include: { rol: true } } } } },
    });

    if (
      !stored ||
      stored.revocado ||
      stored.expiraEn < new Date() ||
      !stored.usuario.activo
    ) {
      throw new UnauthorizedException('Refresh token inválido');
    }

    // Rotación: el token usado queda inválido, se emite uno nuevo.
    await this.prisma.raw.refreshToken.update({
      where: { id: stored.id },
      data: { revocado: true },
    });

    const roles = stored.usuario.roles.map((ur) => ur.rol.nombre);
    const accessToken = this.signAccessToken(
      stored.usuario.id,
      stored.usuario.empresaId,
      roles,
    );
    const newRefreshToken = await this.issueRefreshToken(stored.usuario.id);

    return { accessToken, refreshToken: newRefreshToken };
  }

  async logout(refreshToken: string) {
    const tokenHash = hashRefreshToken(refreshToken);
    await this.prisma.raw.refreshToken.updateMany({
      where: { tokenHash, revocado: false },
      data: { revocado: true },
    });
  }

  /**
   * Reset de password por admin (MVP: sin self-service, ver NOTAS.md).
   * Corre dentro de una request ya autenticada -- acá sí hay empresaId en
   * contexto, así que usa el cliente con filtro de tenant: un admin solo
   * puede tocar usuarios de su propia empresa.
   */
  async changePassword(usuarioId: string, nuevaPassword: string) {
    const hash = await bcrypt.hash(nuevaPassword, 12);

    await this.prisma.db.usuario.update({
      where: { id: usuarioId },
      data: { password: hash },
    });

    // Cierra sesión en todos los dispositivos: fuerza a loguearse de nuevo
    // con la contraseña nueva.
    await this.prisma.db.refreshToken.updateMany({
      where: { usuarioId, revocado: false },
      data: { revocado: true },
    });
  }

  private signAccessToken(usuarioId: string, empresaId: string, roles: string[]) {
    const payload: JwtPayload = { sub: usuarioId, empresaId, roles };
    return this.jwtService.sign(payload);
  }

  private async issueRefreshToken(usuarioId: string): Promise<string> {
    const token = randomBytes(REFRESH_TOKEN_BYTES).toString('hex');
    const expiraEn = new Date(
      Date.now() + REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000,
    );

    await this.prisma.raw.refreshToken.create({
      data: {
        usuarioId,
        tokenHash: hashRefreshToken(token),
        expiraEn,
      },
    });

    return token;
  }
}
