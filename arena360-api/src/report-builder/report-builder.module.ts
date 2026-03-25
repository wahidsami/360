import { Module } from '@nestjs/common';
import { CommonModule } from '../common/common.module';
import { ActivityModule } from '../activity/activity.module';
import { AiModule } from '../ai/ai.module';
import { ReportBuilderService } from './report-builder.service';
import { ReportBuilderAdminController } from './report-builder-admin.controller';
import { ProjectReportsController } from './project-reports.controller';

@Module({
  imports: [CommonModule, AiModule, ActivityModule],
  controllers: [ReportBuilderAdminController, ProjectReportsController],
  providers: [ReportBuilderService],
  exports: [ReportBuilderService],
})
export class ReportBuilderModule {}
