import { IsNumber, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class CreateProductoDto {
  @IsString()
  @MinLength(1)
  nombre: string;

  @IsOptional()
  @IsString()
  sku?: string;

  @IsString()
  unidadMedidaId: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  precioUnitario?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  costo?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  stockMinimo?: number;
}
