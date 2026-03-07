import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { SsoService } from './sso.service';
import { AuthController } from './auth.controller';
import { CommonModule } from '../common/common.module';
import { JwtStrategy } from './jwt.strategy';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [
    CommonModule,
    PassportModule,
    ConfigModule.forRoot(),
    EmailModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET') || 'super-secret-dev-key-change-me',
        signOptions: { expiresIn: '1d' },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, SsoService, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule { }
