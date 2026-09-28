import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class ListObligacionesQueryDto {
  @IsOptional()
  @IsString()
  entidadId?: string;

  // Gastos generales de la empresa (obligaciones sin entidad): no tienen
  // cuenta corriente, así que solo se ven en el listado de Cuentas.
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  sinEntidad?: boolean;

  // 'abiertas' = pendiente + parcial (lo que todavía se puede cobrar/pagar).
  @IsOptional()
  @IsIn(['pendiente', 'parcial', 'cancelada', 'anulada', 'abiertas'])
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
