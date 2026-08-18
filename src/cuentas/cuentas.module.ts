import { Module } from '@nestjs/common';
import { ObligacionesController } from './obligaciones.controller';
import { ObligacionesService } from './obligaciones.service';
import { PagosController } from './pagos.controller';
import { PagosService } from './pagos.service';
import { CuentaCorrienteController } from './cuenta-corriente.controller';
import { CuentasCorrientesService } from './cuentas-corrientes.service';

@Module({
  controllers: [ObligacionesController, PagosController, CuentaCorrienteController],
  providers: [ObligacionesService, PagosService, CuentasCorrientesService],
  // ObligacionesService la usa también RemitosModule para generar la
  // obligación automática al emitir un remito, ver RemitosService.emitir().
  exports: [ObligacionesService],
})
export class CuentasModule {}
