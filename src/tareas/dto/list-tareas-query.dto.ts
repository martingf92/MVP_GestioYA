import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class ListTareasQueryDto {
  @IsOptional()
  @IsIn(['abierta', 'en_proceso', 'cumplida'])
  estado?: string;

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
