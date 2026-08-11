import { IsOptional, IsString } from 'class-validator';

export class CreateClienteDto {
  @IsOptional()
  @IsString()
  categoria?: string;

  @IsOptional()
  @IsString()
  observaciones?: string;
}
