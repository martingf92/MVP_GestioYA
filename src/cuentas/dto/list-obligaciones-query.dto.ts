import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class ListObligacionesQueryDto {
  @IsOptional()
  @IsString()
  entidadId?: string;

  @IsOptional()
  @IsIn(['pendiente', 'parcial', 'cancelada', 'anulada'])
  estado?: string;

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
