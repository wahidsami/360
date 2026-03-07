import { Module } from '@nestjs/common';
import { AutomationService } from './automation.service';
import { AutomationController } from './automation.controller';
import { CommonModule } from '../common/common.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [CommonModule, NotificationsModule],
  controllers: [AutomationController],
  providers: [AutomationService],
  exports: [AutomationService],
})
export class AutomationModule {}
