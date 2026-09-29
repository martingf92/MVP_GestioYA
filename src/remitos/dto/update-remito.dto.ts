import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { CreateDetalleRemitoDto } from './create-detalle-remito.dto';
import { OBSERVACIONES_MAX } from './create-remito.dto';

export class UpdateRemitoDto {
  // Sin `numero`: lo asigna el servidor al emitir (ver RemitosService.emitir).
  @IsOptional()
  @IsIn(['E', 'S'])
  tipo?: 'E' | 'S';

  @IsOptional()
  @IsDateString()
  fecha?: string;

  // "" borra las observaciones.
  @IsOptional()
  @IsString()
  @MaxLength(OBSERVACIONES_MAX)
  observaciones?: string;

  @IsOptional()
  @IsString()
  entidadId?: string;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateDetalleRemitoDto)
  detalles?: CreateDetalleRemitoDto[];
}
