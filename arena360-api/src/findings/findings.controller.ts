import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, Request, Header } from '@nestjs/common';
import { FindingsService } from './findings.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CreateFindingDto, UpdateFindingDto } from './dto/finding.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class FindingsController {
    constructor(private readonly findingsService: FindingsService) { }

    @Get('findings')
    findAllGlobal(@Request() req: any) {
        return this.findingsService.findAllGlobal(req.user);
    }

    @Get('findings/export')
    @Header('Content-Type', 'text/csv')
    @Header('Content-Disposition', 'attachment; filename="findings.csv"')
    async exportCsv(@Request() req: any) {
        return this.findingsService.exportCsv(req.user);
    }

    @Get('findings/:id')
    findOne(@Request() req: any, @Param('id') id: string) {
        return this.findingsService.findOne(id, req.user);
    }

    @Get('projects/:projectId/findings')
    findAll(@Request() req: any, @Param('projectId') projectId: string) {
        return this.findingsService.findAll(projectId, req.user);
    }

    @Post('projects/:projectId/findings')
    create(
        @Request() req: any,
        @Param('projectId') projectId: string,
        @Body() dto: CreateFindingDto
    ) {
        return this.findingsService.create(projectId, req.user, dto);
    }

    @Patch('projects/:projectId/findings/:findingId')
    update(
        @Request() req: any,
        @Param('projectId') projectId: string,
        @Param('findingId') findingId: string,
        @Body() dto: UpdateFindingDto
    ) {
        return this.findingsService.update(projectId, findingId, req.user, dto);
    }

    @Get('findings/:findingId/comments')
    findAllComments(@Request() req: any, @Param('findingId') findingId: string) {
        return this.findingsService.findAllComments(findingId, req.user);
    }

    @Post('findings/:findingId/comments')
    createComment(
        @Request() req: any,
        @Param('findingId') findingId: string,
        @Body() dto: any
    ) {
        return this.findingsService.createComment(findingId, req.user, dto);
    }

    @Delete('projects/:projectId/findings/:findingId')
    delete(
        @Request() req: any,
        @Param('projectId') projectId: string,
        @Param('findingId') findingId: string
    ) {
        return this.findingsService.delete(projectId, findingId, req.user);
    }
}
