import { IsNumber, IsString, Min } from 'class-validator';

export class CreateDetalleRemitoDto {
  @IsString()
  productoId: string;

  @IsNumber()
  @Min(0.001)
  cantidad: number;

  @IsNumber()
  @Min(0)
  precioUnitario: number;
}
