import { IsDateString, IsIn, IsNumber, IsOptional, IsString, Min } from 'class-validator';

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

  // a_cobrar (default): la entidad nos debe (venta, caso original).
  // a_pagar: nosotros le debemos a la entidad (compra a un proveedor,
  // deuda con un acreedor). Ver Obligacion.direccion en schema.prisma.
  @IsOptional()
  @IsIn(['a_cobrar', 'a_pagar'])
  direccion?: 'a_cobrar' | 'a_pagar';
}
