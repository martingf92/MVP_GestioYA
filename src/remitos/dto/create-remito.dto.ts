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

// Tiene que entrar en el PDF sin comerse la hoja.
export const OBSERVACIONES_MAX = 500;

export class CreateRemitoDto {
  // Sin `numero`: lo asigna el servidor al emitir (ver RemitosService.emitir).
  @IsIn(['E', 'S'])
  tipo: 'E' | 'S';

  @IsOptional()
  @IsDateString()
  fecha?: string;

  @IsOptional()
  @IsString()
  @MaxLength(OBSERVACIONES_MAX)
  observaciones?: string;

  @IsOptional()
  @IsString()
  entidadId?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateDetalleRemitoDto)
  detalles: CreateDetalleRemitoDto[];
}
