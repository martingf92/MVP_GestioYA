import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { CreateNotificacionDto } from './create-notificacion.dto';

// Decisión de Martín (entrega 24). Sin prioridad (null) cuenta como normal.
export const PRIORIDADES = ['alta', 'normal', 'baja'] as const;
export type Prioridad = (typeof PRIORIDADES)[number];

export class CreateTareaDto {
  @IsString()
  @MinLength(1)
  titulo: string;

  @IsOptional()
  @IsString()
  descripcion?: string;

  @IsOptional()
  @IsString()
  entidadId?: string;

  @IsOptional()
  @IsDateString()
  fechaVencimiento?: string;

  @IsOptional()
  @IsIn(PRIORIDADES)
  prioridad?: Prioridad;

  @IsOptional()
  @IsString()
  usuarioResponsableId?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateNotificacionDto)
  notificaciones?: CreateNotificacionDto[];
}
