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
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { EntidadesService } from './entidades.service';
import { CreateEntidadDto } from './dto/create-entidad.dto';
import { UpdateEntidadDto } from './dto/update-entidad.dto';
import { ListEntidadesQueryDto } from './dto/list-entidades-query.dto';
import { CreateClienteDto } from './dto/create-cliente.dto';
import { CreateProveedorDto } from './dto/create-proveedor.dto';
import { CreateAcreedorDto } from './dto/create-acreedor.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('entidades')
@UseGuards(JwtAuthGuard)
export class EntidadesController {
  constructor(private readonly entidadesService: EntidadesService) {}

  @Post()
  create(@Body() dto: CreateEntidadDto) {
    return this.entidadesService.create(dto);
  }

  @Get()
  findAll(@Query() query: ListEntidadesQueryDto) {
    return this.entidadesService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.entidadesService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateEntidadDto) {
    return this.entidadesService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.entidadesService.remove(id);
  }

  @Put(':id/cliente')
  upsertCliente(@Param('id') id: string, @Body() dto: CreateClienteDto) {
    return this.entidadesService.upsertCliente(id, dto);
  }

  @Delete(':id/cliente')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeCliente(@Param('id') id: string) {
    return this.entidadesService.removeCliente(id);
  }

  @Put(':id/proveedor')
  upsertProveedor(@Param('id') id: string, @Body() dto: CreateProveedorDto) {
    return this.entidadesService.upsertProveedor(id, dto);
  }

  @Delete(':id/proveedor')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeProveedor(@Param('id') id: string) {
    return this.entidadesService.removeProveedor(id);
  }

  @Put(':id/acreedor')
  upsertAcreedor(@Param('id') id: string, @Body() dto: CreateAcreedorDto) {
    return this.entidadesService.upsertAcreedor(id, dto);
  }

  @Delete(':id/acreedor')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeAcreedor(@Param('id') id: string) {
    return this.entidadesService.removeAcreedor(id);
  }
}
