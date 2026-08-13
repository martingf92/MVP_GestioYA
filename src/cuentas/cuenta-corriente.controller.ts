import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { CuentasCorrientesService } from './cuentas-corrientes.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('entidades/:entidadId/cuenta-corriente')
@UseGuards(JwtAuthGuard)
export class CuentaCorrienteController {
  constructor(private readonly cuentasCorrientes: CuentasCorrientesService) {}

  @Get()
  get(@Param('entidadId') entidadId: string) {
    return this.cuentasCorrientes.getCuentaCorriente(entidadId);
  }
}
