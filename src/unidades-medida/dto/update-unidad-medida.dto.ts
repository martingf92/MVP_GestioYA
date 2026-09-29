import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { CODIGO_MAX } from './create-unidad-medida.dto';

export class UpdateUnidadMedidaDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(CODIGO_MAX)
  codigo?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  descripcion?: string;
}
