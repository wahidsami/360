import { Module } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { TasksController } from './tasks.controller';
import { CommonModule } from '../common/common.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AutomationModule } from '../automation/automation.module';
import { ActivityModule } from '../activity/activity.module';
import { SlaModule } from '../sla/sla.module';

@Module({
  imports: [CommonModule, NotificationsModule, AutomationModule, ActivityModule, SlaModule],
  controllers: [TasksController],
  providers: [TasksService],
})
export class TasksModule { }
