import { Module } from '@nestjs/common';
import { RecurringTasksService } from './recurring-tasks.service';
import { RecurringTasksController } from './recurring-tasks.controller';
import { CommonModule } from '../common/common.module';

@Module({
  imports: [CommonModule],
  controllers: [RecurringTasksController],
  providers: [RecurringTasksService],
  exports: [RecurringTasksService],
})
export class RecurringTasksModule {}
