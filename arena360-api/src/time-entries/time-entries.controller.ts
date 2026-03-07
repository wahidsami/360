import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { TimeEntriesService } from './time-entries.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('time-entries')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class TimeEntriesController {
  constructor(private readonly timeEntriesService: TimeEntriesService) {}

  @Post('projects/:projectId/time-entries')
  create(@Request() req: { user: { id: string; orgId: string } }, @Param('projectId') projectId: string, @Body() body: { taskId: string; minutes: number; date: string; billable?: boolean; note?: string }) {
    return this.timeEntriesService.create(projectId, req.user.id, req.user.orgId, body);
  }

  @Get('projects/:projectId/time-entries')
  findByProject(@Request() req: { user: any }, @Param('projectId') projectId: string, @Query('from') from: string, @Query('to') to: string) {
    return this.timeEntriesService.findByProject(projectId, req.user, from, to);
  }

  @Get('projects/:projectId/tasks/:taskId/time-entries')
  findByTask(@Request() req: { user: any }, @Param('projectId') projectId: string, @Param('taskId') taskId: string) {
    return this.timeEntriesService.findByTask(projectId, taskId, req.user);
  }

  @Get('time-entries/my')
  findMy(@Request() req: { user: { id: string; orgId: string } }, @Query('from') from: string, @Query('to') to: string) {
    return this.timeEntriesService.findByUser(req.user.id, req.user.orgId, from, to);
  }

  @Patch('projects/:projectId/time-entries/:entryId')
  update(@Request() req: { user: { id: string; orgId: string } }, @Param('projectId') projectId: string, @Param('entryId') entryId: string, @Body() body: any) {
    return this.timeEntriesService.update(projectId, entryId, req.user.id, req.user.orgId, body);
  }

  @Delete('projects/:projectId/time-entries/:entryId')
  delete(@Request() req: { user: { id: string; orgId: string } }, @Param('projectId') projectId: string, @Param('entryId') entryId: string) {
    return this.timeEntriesService.delete(projectId, entryId, req.user.id, req.user.orgId);
  }
}