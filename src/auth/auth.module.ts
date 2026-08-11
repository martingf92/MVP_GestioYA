import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      // expiresIn tipa como StringValue (formato de la lib `ms`, ej. "45m");
      // viene de env como string genérico, de ahí el cast.
      signOptions: {
        expiresIn: (process.env.JWT_ACCESS_EXPIRES ?? '45m') as any,
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService],
  exports: [JwtModule],
})
export class AuthModule {}
