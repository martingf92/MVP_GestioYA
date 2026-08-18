import { IsOptional, IsString } from 'class-validator';

export class CreateAcreedorDto {
  @IsOptional()
  @IsString()
  tipoDeuda?: string;

  @IsOptional()
  @IsString()
  condicionPago?: string;

  @IsOptional()
  @IsString()
  observaciones?: string;
}
