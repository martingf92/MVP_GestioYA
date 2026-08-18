import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { AuditService } from './audit.service';
import { ListAuditoriaQueryDto } from './dto/list-auditoria-query.dto';
import { ListLogsErrorQueryDto } from './dto/list-logs-error-query.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../../auth/guards/admin.guard';

// Solo lectura, solo admin -- son datos operativos/de auditoría, no algo
// que cualquier usuario logueado deba poder revisar.
@Controller()
@UseGuards(JwtAuthGuard, AdminGuard)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get('auditoria')
  findAuditoria(@Query() query: ListAuditoriaQueryDto) {
    return this.auditService.findAuditoria(query);
  }

  @Get('logs-error')
  findLogsError(@Query() query: ListLogsErrorQueryDto, @Req() req: Request) {
    return this.auditService.findLogsError(query, req.user!.empresaId);
  }
}
