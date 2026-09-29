import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Request, Response } from 'express';
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

  @Get(':id/pdf')
  async descargarPdf(@Param('id') id: string, @Res() res: Response) {
    const buffer = await this.remitosService.generatePdf(id);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="remito-${id.slice(0, 8)}.pdf"`);
    res.send(buffer);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateRemitoDto) {
    return this.remitosService.update(id, dto);
  }

  @Delete(':id')
  eliminarBorrador(@Param('id') id: string) {
    return this.remitosService.eliminarBorrador(id);
  }

  @Post(':id/emitir')
  emitir(@Param('id') id: string, @Req() req: Request) {
    return this.remitosService.emitir(id, req.user!.userId);
  }

  @Post(':id/anular')
  anular(@Param('id') id: string, @Req() req: Request) {
    return this.remitosService.anular(id, req.user!.userId);
  }
}
