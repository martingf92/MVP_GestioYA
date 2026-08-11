import { IsOptional, IsString } from 'class-validator';

export class CreateProveedorDto {
  @IsOptional()
  @IsString()
  cbu?: string;

  @IsOptional()
  @IsString()
  aliasCbu?: string;

  @IsOptional()
  @IsString()
  condicionPago?: string;

  @IsOptional()
  @IsString()
  observaciones?: string;
}
