import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { CreateDetalleRemitoDto } from './create-detalle-remito.dto';

export class CreateRemitoDto {
  // Sin `numero`: lo asigna el servidor al emitir (ver RemitosService.emitir).
  @IsIn(['E', 'S'])
  tipo: 'E' | 'S';

  @IsOptional()
  @IsDateString()
  fecha?: string;

  @IsOptional()
  @IsString()
  entidadId?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateDetalleRemitoDto)
  detalles: CreateDetalleRemitoDto[];
}
