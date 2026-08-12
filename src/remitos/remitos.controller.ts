import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { RemitosService } from './remitos.service';
import { CreateRemitoDto } from './dto/create-remito.dto';
import { UpdateRemitoDto } from './dto/update-remito.dto';
import { ListRemitosQueryDto } from './dto/list-remitos-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('remitos')
@UseGuards(JwtAuthGuard)
export class RemitosController {
  constructor(private readonly remitosService: RemitosService) {}

  @Post()
  create(@Body() dto: CreateRemitoDto, @Req() req: Request) {
    return this.remitosService.create(dto, req.user!.userId);
  }

  @Get()
  findAll(@Query() query: ListRemitosQueryDto) {
    return this.remitosService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.remitosService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateRemitoDto) {
    return this.remitosService.update(id, dto);
  }

  @Post(':id/emitir')
  emitir(@Param('id') id: string) {
    return this.remitosService.emitir(id);
  }

  @Post(':id/anular')
  anular(@Param('id') id: string) {
    return this.remitosService.anular(id);
  }
}
