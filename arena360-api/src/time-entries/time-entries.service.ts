import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { UserWithRoles } from '../common/utils/scope.utils';

@Injectable()
export class TimeEntriesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(projectId: string, userId: string, orgId: string, data: { taskId: string; minutes: number; date: string; billable?: boolean; note?: string }) {
    const task = await this.prisma.task.findFirst({
      where: { id: data.taskId, projectId, deletedAt: null },
      include: { project: { select: { orgId: true } } },
    });
    if (!task || task.project.orgId !== orgId) throw new NotFoundException('Task not found');
    const date = new Date(data.date);
    if (isNaN(date.getTime())) throw new ForbiddenException('Invalid date');
    return this.prisma.timeEntry.create({
      data: {
        orgId,
        taskId: data.taskId,
        userId,
        minutes: data.minutes,
        date,
        billable: data.billable ?? true,
        note: data.note ?? undefined,
      },
    });
  }

  async findByTask(projectId: string, taskId: string, user: UserWithRoles) {
    const task = await this.prisma.task.findFirst({
      where: { id: taskId, projectId, project: { orgId: user.orgId } },
    });
    if (!task) throw new NotFoundException('Task not found');
    return this.prisma.timeEntry.findMany({
      where: { taskId },
      orderBy: { date: 'desc' },
      include: { user: { select: { id: true, name: true } } },
    });
  }

  async findByProject(projectId: string, user: UserWithRoles, from?: string, to?: string) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, orgId: user.orgId },
    });
    if (!project) throw new NotFoundException('Project not found');
    const where: any = { task: { projectId } };
    if (from || to) {
      where.date = {};
      if (from) where.date.gte = new Date(from);
      if (to) where.date.lte = new Date(to);
    }
    return this.prisma.timeEntry.findMany({
      where,
      orderBy: { date: 'desc' },
      include: { task: { select: { id: true, title: true } }, user: { select: { id: true, name: true } } },
    });
  }

  async findByUser(userId: string, orgId: string, from?: string, to?: string) {
    const where: any = { userId, orgId };
    if (from || to) {
      where.date = {};
      if (from) where.date.gte = new Date(from);
      if (to) where.date.lte = new Date(to);
    }
    return this.prisma.timeEntry.findMany({
      where,
      orderBy: { date: 'desc' },
      include: { task: { select: { id: true, title: true, projectId: true } } },
    });
  }

  async update(projectId: string, entryId: string, userId: string, orgId: string, data: { minutes?: number; date?: string; billable?: boolean; note?: string }) {
    const entry = await this.prisma.timeEntry.findFirst({
      where: { id: entryId, userId, orgId, task: { projectId } },
    });
    if (!entry) throw new NotFoundException('Time entry not found');
    const updateData: any = {};
    if (data.minutes != null) updateData.minutes = data.minutes;
    if (data.date != null) updateData.date = new Date(data.date);
    if (data.billable != null) updateData.billable = data.billable;
    if (data.note != null) updateData.note = data.note;
    return this.prisma.timeEntry.update({
      where: { id: entryId },
      data: updateData,
    });
  }

  async delete(projectId: string, entryId: string, userId: string, orgId: string) {
    const entry = await this.prisma.timeEntry.findFirst({
      where: { id: entryId, userId, orgId, task: { projectId } },
    });
    if (!entry) throw new NotFoundException('Time entry not found');
    return this.prisma.timeEntry.delete({ where: { id: entryId } });
  }
}
