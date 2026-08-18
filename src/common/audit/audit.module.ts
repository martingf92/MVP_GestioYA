import { Module } from '@nestjs/common';
import { AuditController } from './audit.controller';
import { AuditService } from './audit.service';

// AuditInterceptor (misma carpeta) no vive acá -- AppModule la registra
// directo como APP_INTERCEPTOR global, ver app.module.ts.
@Module({
  controllers: [AuditController],
  providers: [AuditService],
})
export class AuditModule {}
