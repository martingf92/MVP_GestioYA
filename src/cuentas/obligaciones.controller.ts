import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { ObligacionesService } from './obligaciones.service';
import { CreateObligacionDto } from './dto/create-obligacion.dto';
import { ListObligacionesQueryDto } from './dto/list-obligaciones-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('obligaciones')
@UseGuards(JwtAuthGuard)
export class ObligacionesController {
  constructor(private readonly obligacionesService: ObligacionesService) {}

  @Post()
  create(@Body() dto: CreateObligacionDto, @Req() req: Request) {
    return this.obligacionesService.create(dto, req.user!.userId);
  }

  @Get()
  findAll(@Query() query: ListObligacionesQueryDto) {
    return this.obligacionesService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.obligacionesService.findOne(id);
  }

  @Post(':id/anular')
  anular(@Param('id') id: string, @Req() req: Request) {
    return this.obligacionesService.anular(id, req.user!.userId);
  }
}
