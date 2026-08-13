import { IsDateString, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateChequeDto {
  @IsOptional()
  @IsString()
  numero?: string;

  @IsOptional()
  @IsString()
  banco?: string;

  @IsOptional()
  @IsDateString()
  fechaEmision?: string;

  @IsOptional()
  @IsDateString()
  fechaCobro?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  monto?: number;
}
