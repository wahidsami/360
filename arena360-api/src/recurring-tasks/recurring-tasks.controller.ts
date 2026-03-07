import { Controller, Get, Post, Body, Param, Patch, Delete, UseGuards } from '@nestjs/common';
import { RecurringTasksService } from './recurring-tasks.service';
import { CreateRecurringTaskDto } from './dto/create-recurring-task.dto';
import { UpdateRecurringTaskDto } from './dto/update-recurring-task.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Request } from '@nestjs/common';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('projects/:projectId/recurring-tasks')
export class RecurringTasksController {
  constructor(private readonly recurringTasksService: RecurringTasksService) {}

  @Get()
  findAll(@Param('projectId') projectId: string, @Request() req: any) {
    return this.recurringTasksService.findAll(projectId, req.user);
  }

  @Get(':templateId')
  findOne(@Param('projectId') projectId: string, @Param('templateId') templateId: string, @Request() req: any) {
    return this.recurringTasksService.findOne(projectId, templateId, req.user);
  }

  @Post()
  create(@Param('projectId') projectId: string, @Body() dto: CreateRecurringTaskDto, @Request() req: any) {
    return this.recurringTasksService.create(projectId, req.user, dto);
  }

  @Patch(':templateId')
  update(
    @Param('projectId') projectId: string,
    @Param('templateId') templateId: string,
    @Body() dto: UpdateRecurringTaskDto,
    @Request() req: any,
  ) {
    return this.recurringTasksService.update(projectId, templateId, req.user, dto);
  }

  @Delete(':templateId')
  remove(@Param('projectId') projectId: string, @Param('templateId') templateId: string, @Request() req: any) {
    return this.recurringTasksService.remove(projectId, templateId, req.user);
  }
}
