import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, Request, Header } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class TasksController {
    constructor(private readonly tasksService: TasksService) { }

    @Get('tasks/my')
    getMyTasks(@Request() req: any) {
        return this.tasksService.getMyTasks(req.user);
    }

    @Get('projects/:projectId/tasks')
    findAll(@Request() req: any, @Param('projectId') projectId: string) {
        return this.tasksService.findAll(projectId, req.user);
    }

    @Post('projects/:projectId/tasks')
    create(@Request() req: any, @Param('projectId') projectId: string, @Body() dto: CreateTaskDto) {
        return this.tasksService.create(projectId, req.user, dto);
    }

    @Patch('projects/:projectId/tasks/:id')
    update(@Request() req: any, @Param('projectId') projectId: string, @Param('id') id: string, @Body() dto: UpdateTaskDto) {
        return this.tasksService.update(projectId, id, req.user, dto);
    }

    @Delete('projects/:projectId/tasks/:id')
    remove(@Request() req: any, @Param('projectId') projectId: string, @Param('id') id: string) {
        return this.tasksService.delete(projectId, id, req.user);
    }

    @Get('projects/:projectId/task-dependencies')
    getDependencies(@Request() req: any, @Param('projectId') projectId: string) {
        return this.tasksService.getDependencies(projectId, req.user);
    }

    @Post('projects/:projectId/task-dependencies')
    addDependency(@Request() req: any, @Param('projectId') projectId: string, @Body() body: { predecessorTaskId: string; successorTaskId: string }) {
        return this.tasksService.addDependency(projectId, req.user, body.predecessorTaskId, body.successorTaskId);
    }

    @Delete('projects/:projectId/task-dependencies/:dependencyId')
    removeDependency(@Request() req: any, @Param('projectId') projectId: string, @Param('dependencyId') dependencyId: string) {
        return this.tasksService.removeDependency(projectId, dependencyId, req.user);
    }

    @Get('projects/:projectId/tasks/export')
    @Header('Content-Type', 'text/csv')
    @Header('Content-Disposition', 'attachment; filename="tasks.csv"')
    async exportCsv(@Request() req: any, @Param('projectId') projectId: string) {
        return this.tasksService.exportCsv(projectId, req.user);
    }
}
