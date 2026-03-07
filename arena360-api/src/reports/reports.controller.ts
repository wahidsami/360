import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, Request, Res } from '@nestjs/common';
import * as express from 'express';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CreateReportDto, UpdateReportDto } from './dto/report.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class ReportsController {
    constructor(private readonly reportsService: ReportsService) { }

    @Get('projects/:projectId/reports')
    findAll(@Request() req: any, @Param('projectId') projectId: string) {
        return this.reportsService.findAll(projectId, req.user);
    }

    @Post('projects/:projectId/reports')
    create(
        @Request() req: any,
        @Param('projectId') projectId: string,
        @Body() dto: CreateReportDto
    ) {
        return this.reportsService.create(projectId, req.user, dto);
    }

    @Patch('projects/:projectId/reports/:reportId')
    update(
        @Request() req: any,
        @Param('projectId') projectId: string,
        @Param('reportId') reportId: string,
        @Body() dto: UpdateReportDto
    ) {
        return this.reportsService.update(projectId, reportId, req.user, dto);
    }

    @Delete('projects/:projectId/reports/:reportId')
    delete(
        @Request() req: any,
        @Param('projectId') projectId: string,
        @Param('reportId') reportId: string
    ) {
        return this.reportsService.delete(projectId, reportId, req.user);
    }

    @Post('projects/:projectId/reports/generate')
    async generate(
        @Request() req: any,
        @Param('projectId') projectId: string,
        @Body() body: { reportId?: string; format?: 'pptx' | 'pdf' }
    ) {
        const format = body.format === 'pdf' ? 'pdf' : 'pptx';
        return this.reportsService.generate(projectId, body.reportId || null, format, req.user);
    }

    @Get('projects/:projectId/reports/:reportId/download')
    async download(
        @Request() req: any,
        @Param('projectId') projectId: string,
        @Param('reportId') reportId: string,
        @Res() res: express.Response
    ) {
        const { path, filename } = await this.reportsService.getReportForDownload(projectId, reportId, req.user);
        res.download(path, filename);
    }
}
