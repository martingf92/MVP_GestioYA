import {
  MiddlewareConsumer,
  Module,
  NestModule,
  RequestMethod,
} from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { EntidadesModule } from './entidades/entidades.module';
import { UnidadesMedidaModule } from './unidades-medida/unidades-medida.module';
import { ProductosModule } from './productos/productos.module';
import { RemitosModule } from './remitos/remitos.module';
import { CuentasModule } from './cuentas/cuentas.module';
import { TareasModule } from './tareas/tareas.module';
import { AuditModule } from './common/audit/audit.module';
import { AuthMiddleware } from './common/auth/auth.middleware';
import { TenantMiddleware } from './common/tenant/tenant.middleware';
import { AuditInterceptor } from './common/audit/audit.interceptor';
import { ErrorLogFilter } from './common/errors/error-log.filter';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    EntidadesModule,
    UnidadesMedidaModule,
    ProductosModule,
    RemitosModule,
    CuentasModule,
    TareasModule,
    AuditModule,
  ],
  providers: [
    AuthMiddleware,
    TenantMiddleware,
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
    { provide: APP_FILTER, useClass: ErrorLogFilter },
  ],
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
