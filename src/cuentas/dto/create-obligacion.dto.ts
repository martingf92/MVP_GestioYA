import { IsDateString, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateObligacionDto {
  @IsOptional()
  @IsString()
  entidadId?: string;

  @IsNumber()
  @Min(0.01)
  monto: number;

  @IsOptional()
  @IsString()
  tipo?: string;

  @IsOptional()
  @IsString()
  descripcion?: string;

  @IsOptional()
  @IsDateString()
  fechaVencimiento?: string;
}
