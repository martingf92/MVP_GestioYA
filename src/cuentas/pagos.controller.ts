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
import { PagosService } from './pagos.service';
import { CreatePagoDto } from './dto/create-pago.dto';
import { ListPagosQueryDto } from './dto/list-pagos-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('pagos')
@UseGuards(JwtAuthGuard)
export class PagosController {
  constructor(private readonly pagosService: PagosService) {}

  @Post()
  create(@Body() dto: CreatePagoDto, @Req() req: Request) {
    return this.pagosService.create(dto, req.user!.userId);
  }

  @Get()
  findAll(@Query() query: ListPagosQueryDto) {
    return this.pagosService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.pagosService.findOne(id);
  }

  @Post(':id/anular')
  anular(@Param('id') id: string, @Req() req: Request) {
    return this.pagosService.anular(id, req.user!.userId);
  }
}
