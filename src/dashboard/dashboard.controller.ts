import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { FlujoQueryDto } from './dto/flujo-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('resumen')
  resumen() {
    return this.dashboardService.resumen();
  }

  @Get('flujo')
  flujo(@Query() query: FlujoQueryDto) {
    return this.dashboardService.flujo(query.periodo ?? 'diario');
  }
}
