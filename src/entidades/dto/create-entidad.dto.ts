import { Type } from 'class-transformer';
import {
  IsEmail,
  IsOptional,
  IsString,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { CreateClienteDto } from './create-cliente.dto';
import { CreateProveedorDto } from './create-proveedor.dto';
import { CreateAcreedorDto } from './create-acreedor.dto';

export class CreateEntidadDto {
  @IsString()
  @MinLength(1)
  nombre: string;

  @IsOptional()
  @IsString()
  documentoTipo?: string;

  @IsOptional()
  @IsString()
  documentoNro?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  telefono?: string;

  @IsOptional()
  @IsString()
  direccion?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => CreateClienteDto)
  cliente?: CreateClienteDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => CreateProveedorDto)
  proveedor?: CreateProveedorDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => CreateAcreedorDto)
  acreedor?: CreateAcreedorDto;
}
