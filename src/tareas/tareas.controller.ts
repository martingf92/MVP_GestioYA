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
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { TareasService } from './tareas.service';
import { CreateTareaDto } from './dto/create-tarea.dto';
import { UpdateTareaDto } from './dto/update-tarea.dto';
import { ListTareasQueryDto } from './dto/list-tareas-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('tareas')
@UseGuards(JwtAuthGuard)
export class TareasController {
  constructor(private readonly tareasService: TareasService) {}

  @Post()
  create(@Body() dto: CreateTareaDto, @Req() req: Request) {
    return this.tareasService.create(dto, req.user!.userId);
  }

  @Get()
  findAll(@Query() query: ListTareasQueryDto) {
    return this.tareasService.findAll(query);
  }

  // Antes de ':id' a propósito: si no, ':id' matchea "recordatorios" como id.
  @Get('recordatorios')
  getRecordatorios() {
    return this.tareasService.getRecordatorios();
  }

  @Post('recordatorios/:notificacionId/visto')
  marcarRecordatorioVisto(@Param('notificacionId') notificacionId: string) {
    return this.tareasService.marcarRecordatorioVisto(notificacionId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.tareasService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateTareaDto) {
    return this.tareasService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.tareasService.remove(id);
  }
}
