import { Module } from '@nestjs/common';
import { CommonModule } from '../common/common.module';
import { ProjectWorkspaceAdminController, ProjectWorkspaceController } from './project-workspace.controller';
import { ProjectWorkspaceService } from './project-workspace.service';

@Module({
  imports: [CommonModule],
  controllers: [ProjectWorkspaceAdminController, ProjectWorkspaceController],
  providers: [ProjectWorkspaceService],
  exports: [ProjectWorkspaceService],
})
export class ProjectWorkspaceModule {}
