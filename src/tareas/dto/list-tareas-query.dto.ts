import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class ListTareasQueryDto {
  // 'pendientes' = abierta + en_proceso.
  @IsOptional()
  @IsIn(['abierta', 'en_proceso', 'cumplida', 'pendientes'])
  estado?: string;

  // Pendientes con el vencimiento ya pasado.
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  vencidas?: boolean;

  @IsOptional()
  @IsString()
  entidadId?: string;

  @IsOptional()
  @IsString()
  usuarioResponsableId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  skip?: number = 0;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  take?: number = 20;
}
