import { IsDateString, IsIn, IsOptional, IsString, MinLength, ValidateIf } from 'class-validator';
import { PRIORIDADES, Prioridad } from './create-tarea.dto';

/**
 * En entidadId, fechaVencimiento, descripcion y recordatorio: undefined = no
 * tocar, null = sacarlo.
 */
export class UpdateTareaDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  titulo?: string;

  @ValidateIf((_, v) => v !== undefined && v !== null)
  @IsString()
  descripcion?: string | null;

  @ValidateIf((_, v) => v !== undefined && v !== null)
  @IsString()
  entidadId?: string | null;

  @ValidateIf((_, v) => v !== undefined && v !== null)
  @IsDateString()
  fechaVencimiento?: string | null;

  @IsOptional()
  @IsIn(PRIORIDADES)
  prioridad?: Prioridad;

  @IsOptional()
  @IsString()
  usuarioResponsableId?: string;

  @IsOptional()
  @IsIn(['abierta', 'en_proceso', 'cumplida'])
  estado?: string;

  /**
   * Cuándo avisar en la app. Reemplaza el recordatorio "app" pendiente de la
   * tarea (si había uno); null lo saca.
   */
  @ValidateIf((_, v) => v !== undefined && v !== null)
  @IsDateString()
  recordatorio?: string | null;
}
