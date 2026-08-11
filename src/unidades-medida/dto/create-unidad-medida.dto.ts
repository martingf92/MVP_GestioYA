import { IsOptional, IsString, MinLength } from 'class-validator';

export class CreateUnidadMedidaDto {
  @IsString()
  @MinLength(1)
  codigo: string;

  @IsString()
  @MinLength(1)
  descripcion: string;

  @IsOptional()
  @IsString()
  tipo?: string;
}
