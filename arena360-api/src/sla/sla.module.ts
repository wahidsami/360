import { Module } from '@nestjs/common';
import { SlaService } from './sla.service';
import { SlaController } from './sla.controller';
import { CommonModule } from '../common/common.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [CommonModule, NotificationsModule],
  controllers: [SlaController],
  providers: [SlaService],
  exports: [SlaService],
})
export class SlaModule {}
