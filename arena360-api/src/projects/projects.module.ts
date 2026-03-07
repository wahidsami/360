import { Module } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { ProjectsController } from './projects.controller';
import { CommonModule } from '../common/common.module';
import { ActivityModule } from '../activity/activity.module';

@Module({
  imports: [CommonModule, ActivityModule],
  controllers: [ProjectsController],
  providers: [ProjectsService],
})
export class ProjectsModule { }
