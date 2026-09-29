import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { UnidadesMedidaService } from './unidades-medida.service';
import { CreateUnidadMedidaDto } from './dto/create-unidad-medida.dto';
import { UpdateUnidadMedidaDto } from './dto/update-unidad-medida.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('unidades-medida')
@UseGuards(JwtAuthGuard)
export class UnidadesMedidaController {
  constructor(private readonly unidadesMedidaService: UnidadesMedidaService) {}

  @Post()
  create(@Body() dto: CreateUnidadMedidaDto) {
    return this.unidadesMedidaService.create(dto);
  }

  @Get()
  findAll() {
    return this.unidadesMedidaService.findAll();
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateUnidadMedidaDto) {
    return this.unidadesMedidaService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.unidadesMedidaService.remove(id);
  }
}
