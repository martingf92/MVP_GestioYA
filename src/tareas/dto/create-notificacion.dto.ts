import { IsDateString, IsIn } from 'class-validator';

export class CreateNotificacionDto {
  @IsIn(['app', 'email', 'sms', 'whatsapp'])
  canal: 'app' | 'email' | 'sms' | 'whatsapp';

  @IsDateString()
  fechaProgramada: string;
}
