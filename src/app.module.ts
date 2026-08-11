import {
  MiddlewareConsumer,
  Module,
  NestModule,
  RequestMethod,
} from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { EntidadesModule } from './entidades/entidades.module';
import { AuthMiddleware } from './common/auth/auth.middleware';
import { TenantMiddleware } from './common/tenant/tenant.middleware';

@Module({
  imports: [PrismaModule, AuthModule, EntidadesModule],
  providers: [AuthMiddleware, TenantMiddleware],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Orden importa: AuthMiddleware primero (puebla req.user leyendo el JWT),
    // TenantMiddleware después (arranca TenantContext a partir de req.user).
    consumer
      .apply(AuthMiddleware, TenantMiddleware)
      .exclude(
        { path: 'auth/login', method: RequestMethod.POST },
        { path: 'auth/refresh', method: RequestMethod.POST },
      )
      .forRoutes('*');
  }
}
