import { Injectable, NotFoundException } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../common/prisma.service';
import { ScopeUtils, UserWithRoles } from '../common/utils/scope.utils';
import { CreateRecurringTaskDto } from './dto/create-recurring-task.dto';
import { UpdateRecurringTaskDto } from './dto/update-recurring-task.dto';
import { TaskPriority } from '@prisma/client';

@Injectable()
export class RecurringTasksService {
  constructor(private prisma: PrismaService) {}

  async findAll(projectId: string, user: UserWithRoles) {
    await this.ensureProjectAccess(projectId, user);
    return this.prisma.recurringTaskTemplate.findMany({
      where: { projectId },
      orderBy: { nextRunAt: 'asc' },
    });
  }

  async findOne(projectId: string, templateId: string, user: UserWithRoles) {
    await this.ensureProjectAccess(projectId, user);
    const template = await this.prisma.recurringTaskTemplate.findFirst({
      where: { id: templateId, projectId },
    });
    if (!template) throw new NotFoundException('Recurring task template not found');
    return template;
  }

  async create(projectId: string, user: UserWithRoles, dto: CreateRecurringTaskDto) {
    const project = await this.ensureProjectAccess(projectId, user);
    const priority = (dto.priority?.toUpperCase().replace(/-/g, '_') || 'MEDIUM') as TaskPriority;
    const nextRunAt = dto.nextRunAt ? new Date(dto.nextRunAt) : new Date();
    return this.prisma.recurringTaskTemplate.create({
      data: {
        projectId,
        orgId: project.orgId,
        title: dto.title,
        description: dto.description ?? null,
        priority,
        recurrenceRule: dto.recurrenceRule as object,
        nextRunAt,
        isActive: true,
      },
    });
  }

  async update(projectId: string, templateId: string, user: UserWithRoles, dto: UpdateRecurringTaskDto) {
    await this.ensureProjectAccess(projectId, user);
    const template = await this.prisma.recurringTaskTemplate.findFirst({
      where: { id: templateId, projectId },
    });
    if (!template) throw new NotFoundException('Recurring task template not found');

    const data: any = {};
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.priority !== undefined) data.priority = dto.priority.toUpperCase().replace(/-/g, '_') as TaskPriority;
    if (dto.recurrenceRule !== undefined) data.recurrenceRule = dto.recurrenceRule;
    if (dto.nextRunAt !== undefined) data.nextRunAt = new Date(dto.nextRunAt);
    if (dto.isActive !== undefined) data.isActive = dto.isActive;

    return this.prisma.recurringTaskTemplate.update({
      where: { id: templateId },
      data,
    });
  }

  async remove(projectId: string, templateId: string, user: UserWithRoles) {
    await this.ensureProjectAccess(projectId, user);
    const template = await this.prisma.recurringTaskTemplate.findFirst({
      where: { id: templateId, projectId },
    });
    if (!template) throw new NotFoundException('Recurring task template not found');
    return this.prisma.recurringTaskTemplate.delete({ where: { id: templateId } });
  }

  /** Cron: every minute, create tasks from due templates and advance nextRunAt */
  @Cron('* * * * *')
  async processDueTemplates() {
    const now = new Date();
    const due = await this.prisma.recurringTaskTemplate.findMany({
      where: { isActive: true, nextRunAt: { lte: now } },
      include: { project: true },
    });
    for (const t of due) {
      try {
        await this.prisma.$transaction(async (tx) => {
          const runAt = t.nextRunAt;
          await tx.task.create({
            data: {
              projectId: t.projectId,
              title: t.title,
              description: t.description,
              status: 'TODO',
              priority: t.priority,
              sourceRecurringId: t.id,
            },
          });
          const nextRun = this.computeNextRun(runAt, t.recurrenceRule as { frequency: string; interval?: number; weekday?: number });
          await tx.recurringTaskTemplate.update({
            where: { id: t.id },
            data: { lastRunAt: runAt, nextRunAt: nextRun },
          });
        });
      } catch (err) {
        // Log but don't fail other templates
        console.error(`RecurringTasksService: failed to process template ${t.id}`, err);
      }
    }
  }

  private computeNextRun(from: Date, rule: { frequency: string; interval?: number; weekday?: number }): Date {
    const interval = Math.max(1, rule.interval ?? 1);
    const next = new Date(from);
    const freq = (rule.frequency || 'DAILY').toUpperCase();

    if (freq === 'DAILY') {
      next.setDate(next.getDate() + interval);
      return next;
    }
    if (freq === 'WEEKLY') {
      next.setDate(next.getDate() + 7 * interval);
      if (rule.weekday != null && rule.weekday >= 1 && rule.weekday <= 7) {
        const currentDay = next.getDay();
        const target = rule.weekday === 7 ? 0 : rule.weekday;
        const diff = (target - currentDay + 7) % 7;
        next.setDate(next.getDate() + (diff === 0 ? 7 : diff));
      }
      return next;
    }
    if (freq === 'MONTHLY') {
      next.setMonth(next.getMonth() + interval);
      return next;
    }
    next.setDate(next.getDate() + interval);
    return next;
  }

  private async ensureProjectAccess(projectId: string, user: UserWithRoles) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, ...ScopeUtils.clientScope(user, 'clientId'), deletedAt: null },
    });
    if (!project) throw new NotFoundException('Project not found');
    return project;
  }
}
