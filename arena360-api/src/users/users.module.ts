import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { UsersMeController } from './users-me.controller';
import { CommonModule } from '../common/common.module';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [CommonModule, EmailModule],
  controllers: [UsersController, UsersMeController],
  providers: [UsersService]
})
export class UsersModule { }
