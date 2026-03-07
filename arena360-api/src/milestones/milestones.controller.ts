import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { MilestonesService } from './milestones.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CreateMilestoneDto, UpdateMilestoneDto } from './dto/milestone.dto';
import { CreateProjectUpdateDto } from './dto/project-update.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class MilestonesController {
    constructor(private readonly milestonesService: MilestonesService) { }

    // === MILESTONES ===

    @Get('projects/:projectId/milestones')
    findAllMilestones(@Request() req: any, @Param('projectId') projectId: string) {
        return this.milestonesService.findAllMilestones(projectId, req.user);
    }

    @Post('projects/:projectId/milestones')
    createMilestone(
        @Request() req: any,
        @Param('projectId') projectId: string,
        @Body() dto: CreateMilestoneDto
    ) {
        return this.milestonesService.createMilestone(projectId, req.user, dto);
    }

    @Patch('projects/:projectId/milestones/:milestoneId')
    updateMilestone(
        @Request() req: any,
        @Param('projectId') projectId: string,
        @Param('milestoneId') milestoneId: string,
        @Body() dto: UpdateMilestoneDto
    ) {
        return this.milestonesService.updateMilestone(projectId, milestoneId, req.user, dto);
    }

    @Delete('projects/:projectId/milestones/:milestoneId')
    deleteMilestone(
        @Request() req: any,
        @Param('projectId') projectId: string,
        @Param('milestoneId') milestoneId: string
    ) {
        return this.milestonesService.deleteMilestone(projectId, milestoneId, req.user);
    }

    // === PROJECT UPDATES ===

    @Get('projects/:projectId/updates')
    findAllUpdates(@Request() req: any, @Param('projectId') projectId: string) {
        return this.milestonesService.findAllUpdates(projectId, req.user);
    }

    @Post('projects/:projectId/updates')
    createUpdate(
        @Request() req: any,
        @Param('projectId') projectId: string,
        @Body() dto: CreateProjectUpdateDto
    ) {
        return this.milestonesService.createUpdate(projectId, req.user, dto);
    }
}
