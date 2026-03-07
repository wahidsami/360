import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { SprintsService } from './sprints.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('sprints')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class SprintsController {
  constructor(private readonly sprintsService: SprintsService) {}

  @Get('projects/:projectId/sprints')
  findAll(@Request() req: { user: any }, @Param('projectId') projectId: string) {
    return this.sprintsService.findAll(projectId, req.user);
  }

  @Get('projects/:projectId/sprints/:sprintId')
  findOne(@Request() req: { user: any }, @Param('projectId') projectId: string, @Param('sprintId') sprintId: string) {
    return this.sprintsService.findOne(projectId, sprintId, req.user);
  }

  @Get('projects/:projectId/sprints/:sprintId/tasks')
  getSprintTasks(@Request() req: { user: any }, @Param('projectId') projectId: string, @Param('sprintId') sprintId: string) {
    return this.sprintsService.getTasks(projectId, sprintId, req.user);
  }

  @Get('projects/:projectId/backlog/tasks')
  getBacklogTasks(@Request() req: { user: any }, @Param('projectId') projectId: string) {
    return this.sprintsService.getTasks(projectId, null, req.user);
  }

  @Post('projects/:projectId/sprints')
  create(@Request() req: { user: any }, @Param('projectId') projectId: string, @Body() body: any) {
    return this.sprintsService.create(projectId, req.user, body);
  }

  @Patch('projects/:projectId/sprints/:sprintId')
  update(@Request() req: { user: any }, @Param('projectId') projectId: string, @Param('sprintId') sprintId: string, @Body() body: any) {
    return this.sprintsService.update(projectId, sprintId, req.user, body);
  }

  @Delete('projects/:projectId/sprints/:sprintId')
  remove(@Request() req: { user: any }, @Param('projectId') projectId: string, @Param('sprintId') sprintId: string) {
    return this.sprintsService.remove(projectId, sprintId, req.user);
  }
}
