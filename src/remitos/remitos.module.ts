import { Module } from '@nestjs/common';
import { RemitosController } from './remitos.controller';
import { RemitosService } from './remitos.service';
import { CuentasModule } from '../cuentas/cuentas.module';

@Module({
  imports: [CuentasModule],
  controllers: [RemitosController],
  providers: [RemitosService],
})
export class RemitosModule {}
