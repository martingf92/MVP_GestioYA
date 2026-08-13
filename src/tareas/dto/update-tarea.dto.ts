import { IsDateString, IsIn, IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateTareaDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  titulo?: string;

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
  @IsString()
  prioridad?: string;

  @IsOptional()
  @IsString()
  usuarioResponsableId?: string;

  @IsOptional()
  @IsIn(['abierta', 'en_proceso', 'cumplida'])
  estado?: string;
}
