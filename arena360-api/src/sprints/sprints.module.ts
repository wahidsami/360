import { Module } from '@nestjs/common';
import { SprintsService } from './sprints.service';
import { SprintsController } from './sprints.controller';
import { CommonModule } from '../common/common.module';

@Module({
  imports: [CommonModule],
  controllers: [SprintsController],
  providers: [SprintsService],
  exports: [SprintsService],
})
export class SprintsModule {}
