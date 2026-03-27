import { Body, Controller, Get, Param, Patch, Post, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermissions } from '../auth/permissions.decorator';
import { ProjectWorkspaceService } from './project-workspace.service';
import {
  AssignClientWorkspaceTemplateDto,
  CreateProjectWorkspaceTemplateDto,
  UpdateClientWorkspaceTemplateAssignmentDto,
  UpdateProjectWorkspaceTemplateDto,
} from './dto/project-workspace.dto';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('admin/project-workspaces')
export class ProjectWorkspaceAdminController {
  constructor(private readonly service: ProjectWorkspaceService) {}

  @Get('templates')
  @RequirePermissions('MANAGE_WORKSPACE_TEMPLATES')
  listTemplates(@Request() req: any) {
    return this.service.listTemplates(req.user.orgId);
  }

  @Post('templates')
  @RequirePermissions('MANAGE_WORKSPACE_TEMPLATES')
  createTemplate(@Request() req: any, @Body() dto: CreateProjectWorkspaceTemplateDto) {
    return this.service.createTemplate(req.user.orgId, req.user, dto);
  }

  @Patch('templates/:id')
  @RequirePermissions('MANAGE_WORKSPACE_TEMPLATES')
  updateTemplate(@Request() req: any, @Param('id') id: string, @Body() dto: UpdateProjectWorkspaceTemplateDto) {
    return this.service.updateTemplate(req.user.orgId, id, dto);
  }

  @Get('clients/:clientId/assignments')
  @RequirePermissions('ASSIGN_WORKSPACE_TEMPLATES')
  listClientAssignments(@Request() req: any, @Param('clientId') clientId: string) {
    return this.service.listClientAssignments(req.user.orgId, clientId);
  }

  @Post('clients/:clientId/assignments')
  @RequirePermissions('ASSIGN_WORKSPACE_TEMPLATES')
  createClientAssignment(@Request() req: any, @Param('clientId') clientId: string, @Body() dto: AssignClientWorkspaceTemplateDto) {
    return this.service.createClientAssignment(req.user.orgId, clientId, req.user, dto);
  }

  @Patch('client-assignments/:assignmentId')
  @RequirePermissions('ASSIGN_WORKSPACE_TEMPLATES')
  updateClientAssignment(
    @Request() req: any,
    @Param('assignmentId') assignmentId: string,
    @Body() dto: UpdateClientWorkspaceTemplateAssignmentDto,
  ) {
    return this.service.updateClientAssignment(req.user.orgId, assignmentId, dto, req.user);
  }
}

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('project-workspaces')
export class ProjectWorkspaceController {
  constructor(private readonly service: ProjectWorkspaceService) {}

  @Get('clients/:clientId/default-draft')
  @RequirePermissions('MANAGE_PROJECTS', 'ASSIGN_WORKSPACE_TEMPLATES')
  getDefaultClientTemplateDraft(@Request() req: any, @Param('clientId') clientId: string) {
    return this.service.getDefaultClientTemplateDraft(req.user.orgId, clientId);
  }
}
