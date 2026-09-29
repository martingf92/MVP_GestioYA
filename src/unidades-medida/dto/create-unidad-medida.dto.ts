import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

// El código se muestra al lado de cada cantidad (remitos, PDF): tiene que
// ser corto.
export const CODIGO_MAX = 12;

export class CreateUnidadMedidaDto {
  @IsString()
  @MinLength(1)
  @MaxLength(CODIGO_MAX)
  codigo: string;

  @IsString()
  @MinLength(1)
  descripcion: string;

  @IsOptional()
  @IsString()
  tipo?: string;
}
