import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class ListRemitosQueryDto {
  @IsOptional()
  @IsIn(['E', 'S'])
  tipo?: 'E' | 'S';

  @IsOptional()
  @IsIn(['borrador', 'emitido', 'anulado'])
  estado?: 'borrador' | 'emitido' | 'anulado';

  @IsOptional()
  @IsString()
  entidadId?: string;

  // Búsqueda libre por nombre de la entidad o número del remito.
  @IsOptional()
  @IsString()
  q?: string;

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
