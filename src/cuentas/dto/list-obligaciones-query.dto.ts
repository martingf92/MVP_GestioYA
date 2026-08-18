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
  @IsIn(['a_cobrar', 'a_pagar'])
  direccion?: string;

  // Filtra por el sub-perfil de la entidad asociada -- para la vista
  // comparativa Proveedor vs Acreedor que pidió Martín.
  @IsOptional()
  @IsIn(['proveedor', 'acreedor'])
  tipoEntidad?: 'proveedor' | 'acreedor';

  @IsOptional()
  @IsIn(['asc', 'desc'])
  orderDir?: 'asc' | 'desc' = 'desc';

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
