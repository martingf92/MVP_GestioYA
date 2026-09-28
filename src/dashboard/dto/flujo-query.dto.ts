import { IsIn, IsOptional } from 'class-validator';

export class FlujoQueryDto {
  @IsOptional()
  @IsIn(['diario', 'semanal', 'mensual'])
  periodo?: 'diario' | 'semanal' | 'mensual' = 'diario';
}
