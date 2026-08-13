import { IsNumber, IsString, Min } from 'class-validator';

export class CreateAplicacionDto {
  @IsString()
  obligacionId: string;

  @IsNumber()
  @Min(0.01)
  monto: number;
}
