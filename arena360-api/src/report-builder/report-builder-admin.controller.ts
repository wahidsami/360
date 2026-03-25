import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermissions } from '../auth/permissions.decorator';
import { ReportBuilderService } from './report-builder.service';
import {
  AssignClientReportTemplateDto,
  CreateReportBuilderTemplateDto,
  CreateReportBuilderTemplateVersionDto,
  UpdateClientReportTemplateAssignmentDto,
  UpdateReportBuilderTemplateDto,
} from './dto/report-builder.dto';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('admin/report-builder')
export class ReportBuilderAdminController {
  constructor(private readonly service: ReportBuilderService) {}

  @Get('templates')
  @RequirePermissions('MANAGE_REPORT_TEMPLATES')
  listTemplates(@Request() req: any) {
    return this.service.listTemplates(req.user.orgId);
  }

  @Post('templates')
  @RequirePermissions('MANAGE_REPORT_TEMPLATES')
  createTemplate(@Request() req: any, @Body() dto: CreateReportBuilderTemplateDto) {
    return this.service.createTemplate(req.user.orgId, req.user, dto);
  }

  @Patch('templates/:id')
  @RequirePermissions('MANAGE_REPORT_TEMPLATES')
  updateTemplate(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateReportBuilderTemplateDto,
  ) {
    return this.service.updateTemplate(req.user.orgId, id, dto, req.user);
  }

  @Post('templates/:id/versions')
  @RequirePermissions('MANAGE_REPORT_TEMPLATES')
  createTemplateVersion(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: CreateReportBuilderTemplateVersionDto,
  ) {
    return this.service.createTemplateVersion(req.user.orgId, id, dto, req.user);
  }

  @Post('templates/:id/versions/:versionId/publish')
  @RequirePermissions('MANAGE_REPORT_TEMPLATES')
  publishTemplateVersion(
    @Request() req: any,
    @Param('id') id: string,
    @Param('versionId') versionId: string,
  ) {
    return this.service.publishTemplateVersion(req.user.orgId, id, versionId, req.user);
  }

  @Get('templates/:id/versions/:versionId/sample-preview')
  @RequirePermissions('MANAGE_REPORT_TEMPLATES')
  getTemplateVersionSamplePreview(
    @Request() req: any,
    @Param('id') id: string,
    @Param('versionId') versionId: string,
  ) {
    return this.service.getTemplateVersionSamplePreview(req.user.orgId, id, versionId);
  }

  @Get('clients/:clientId/assignments')
  @RequirePermissions('ASSIGN_REPORT_TEMPLATES')
  listClientAssignments(@Request() req: any, @Param('clientId') clientId: string) {
    return this.service.listClientAssignments(req.user.orgId, clientId);
  }

  @Post('clients/:clientId/assignments')
  @RequirePermissions('ASSIGN_REPORT_TEMPLATES')
  createClientAssignment(
    @Request() req: any,
    @Param('clientId') clientId: string,
    @Body() dto: AssignClientReportTemplateDto,
  ) {
    return this.service.createClientAssignment(req.user.orgId, clientId, req.user, dto);
  }

  @Patch('client-assignments/:assignmentId')
  @RequirePermissions('ASSIGN_REPORT_TEMPLATES')
  updateClientAssignment(
    @Request() req: any,
    @Param('assignmentId') assignmentId: string,
    @Body() dto: UpdateClientReportTemplateAssignmentDto,
  ) {
    return this.service.updateClientAssignment(req.user.orgId, assignmentId, dto, req.user);
  }
}
