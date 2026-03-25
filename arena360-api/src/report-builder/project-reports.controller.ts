import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Request,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermissions } from '../auth/permissions.decorator';
import { ReportBuilderService } from './report-builder.service';
import {
  CreateProjectReportDto,
  CreateProjectReportEntryDto,
  ReorderProjectReportEntriesDto,
  UpdateProjectReportDto,
  UpdateProjectReportEntryDto,
} from './dto/report-builder.dto';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller()
export class ProjectReportsController {
  constructor(private readonly service: ReportBuilderService) {}

  @Get('projects/:projectId/report-builder/templates')
  listAvailableTemplates(@Request() req: any, @Param('projectId') projectId: string) {
    return this.service.listAvailableTemplates(projectId, req.user);
  }

  @Get('project-reports/client-visible')
  @RequirePermissions('VIEW_CLIENT_REPORTS')
  listClientVisibleReports(@Request() req: any) {
    return this.service.listClientVisibleReports(req.user);
  }

  @Get('projects/:projectId/project-reports')
  listProjectReports(@Request() req: any, @Param('projectId') projectId: string) {
    return this.service.listProjectReports(projectId, req.user);
  }

  @Post('projects/:projectId/project-reports')
  @RequirePermissions('CREATE_PROJECT_REPORTS')
  createProjectReport(
    @Request() req: any,
    @Param('projectId') projectId: string,
    @Body() dto: CreateProjectReportDto,
  ) {
    return this.service.createProjectReport(projectId, req.user, dto);
  }

  @Get('project-reports/:reportId')
  getProjectReport(@Request() req: any, @Param('reportId') reportId: string) {
    return this.service.getProjectReport(reportId, req.user);
  }

  @Patch('project-reports/:reportId')
  @RequirePermissions('EDIT_PROJECT_REPORTS')
  updateProjectReport(
    @Request() req: any,
    @Param('reportId') reportId: string,
    @Body() dto: UpdateProjectReportDto,
  ) {
    return this.service.updateProjectReport(reportId, req.user, dto);
  }

  @Get('project-reports/:reportId/entries')
  listProjectReportEntries(@Request() req: any, @Param('reportId') reportId: string) {
    return this.service.listProjectReportEntries(reportId, req.user);
  }

  @Post('project-reports/:reportId/entries')
  @RequirePermissions('EDIT_PROJECT_REPORT_ENTRIES')
  createProjectReportEntry(
    @Request() req: any,
    @Param('reportId') reportId: string,
    @Body() dto: CreateProjectReportEntryDto,
  ) {
    return this.service.createProjectReportEntry(reportId, req.user, dto);
  }

  @Patch('project-reports/:reportId/entries/reorder')
  @RequirePermissions('EDIT_PROJECT_REPORT_ENTRIES')
  reorderProjectReportEntries(
    @Request() req: any,
    @Param('reportId') reportId: string,
    @Body() dto: ReorderProjectReportEntriesDto,
  ) {
    return this.service.reorderProjectReportEntries(reportId, req.user, dto);
  }

  @Patch('project-reports/:reportId/entries/:entryId')
  @RequirePermissions('EDIT_PROJECT_REPORT_ENTRIES')
  updateProjectReportEntry(
    @Request() req: any,
    @Param('reportId') reportId: string,
    @Param('entryId') entryId: string,
    @Body() dto: UpdateProjectReportEntryDto,
  ) {
    return this.service.updateProjectReportEntry(reportId, entryId, req.user, dto);
  }

  @Delete('project-reports/:reportId/entries/:entryId')
  @RequirePermissions('EDIT_PROJECT_REPORT_ENTRIES')
  deleteProjectReportEntry(
    @Request() req: any,
    @Param('reportId') reportId: string,
    @Param('entryId') entryId: string,
  ) {
    return this.service.deleteProjectReportEntry(reportId, entryId, req.user);
  }

  @Post('project-reports/:reportId/entries/:entryId/media')
  @RequirePermissions('EDIT_PROJECT_REPORT_ENTRIES')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 50 * 1024 * 1024 } }))
  uploadProjectReportEntryMedia(
    @Request() req: any,
    @Param('reportId') reportId: string,
    @Param('entryId') entryId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body('caption') caption?: string,
  ) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }
    return this.service.uploadProjectReportEntryMedia(reportId, entryId, req.user, file, caption);
  }

  @Delete('project-reports/:reportId/entries/:entryId/media/:mediaId')
  @RequirePermissions('EDIT_PROJECT_REPORT_ENTRIES')
  deleteProjectReportEntryMedia(
    @Request() req: any,
    @Param('reportId') reportId: string,
    @Param('entryId') entryId: string,
    @Param('mediaId') mediaId: string,
  ) {
    return this.service.deleteProjectReportEntryMedia(reportId, entryId, mediaId, req.user);
  }

  @Get('project-reports/:reportId/preview')
  getProjectReportPreview(@Request() req: any, @Param('reportId') reportId: string) {
    return this.service.getProjectReportPreview(reportId, req.user);
  }

  @Get('project-reports/:reportId/latest-export')
  getLatestProjectReportExport(@Request() req: any, @Param('reportId') reportId: string) {
    return this.service.getLatestProjectReportExportDownload(reportId, req.user);
  }

  @Post('project-reports/:reportId/generate-ai-summary')
  @RequirePermissions('GENERATE_PROJECT_REPORT_EXPORTS')
  generateProjectReportAiSummary(@Request() req: any, @Param('reportId') reportId: string) {
    return this.service.generateProjectReportAiSummary(reportId, req.user);
  }

  @Post('project-reports/:reportId/export-pdf')
  @RequirePermissions('GENERATE_PROJECT_REPORT_EXPORTS')
  exportProjectReportPdf(@Request() req: any, @Param('reportId') reportId: string) {
    return this.service.exportProjectReportPdf(reportId, req.user);
  }
}
