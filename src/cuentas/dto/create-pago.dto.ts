import { Type } from 'class-transformer';
import {
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { CreateAplicacionDto } from './create-aplicacion.dto';
import { CreateChequeDto } from './create-cheque.dto';

export class CreatePagoDto {
  @IsOptional()
  @IsString()
  entidadId?: string;

  @IsNumber()
  @Min(0.01)
  monto: number;

  @IsOptional()
  @IsString()
  medio?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateAplicacionDto)
  aplicaciones?: CreateAplicacionDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateChequeDto)
  cheques?: CreateChequeDto[];
}
