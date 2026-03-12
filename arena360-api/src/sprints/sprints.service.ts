import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { ScopeUtils, UserWithRoles } from '../common/utils/scope.utils';
import { SprintStatus } from '@prisma/client';

@Injectable()
export class SprintsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(projectId: string, user: UserWithRoles) {
    await this.ensureProjectAccess(projectId, user);
    return this.prisma.sprint.findMany({
      where: { projectId },
      orderBy: [{ startDate: 'desc' }],
      include: { _count: { select: { tasks: true } } },
    });
  }

  async findOne(projectId: string, sprintId: string, user: UserWithRoles) {
    await this.ensureProjectAccess(projectId, user);
    const sprint = await this.prisma.sprint.findFirst({
      where: { id: sprintId, projectId },
      include: { tasks: { where: { deletedAt: null }, include: { assignee: { select: { id: true, name: true } } } } },
    });
    if (!sprint) throw new NotFoundException('Sprint not found');
    return sprint;
  }

  async getTasks(projectId: string, sprintId: string | null, user: UserWithRoles) {
    await this.ensureProjectAccess(projectId, user);
    const where: any = { projectId, deletedAt: null };
    if (sprintId === null || sprintId === '') {
      where.sprintId = null;
    } else {
      where.sprintId = sprintId;
    }
    return this.prisma.task.findMany({
      where,
      include: { assignee: { select: { id: true, name: true } } },
      orderBy: [{ status: 'asc' }, { storyPoints: 'asc' }],
    });
  }

  async create(projectId: string, user: UserWithRoles, dto: { name: string; goal?: string; startDate: string; endDate: string; status?: SprintStatus }) {
    await this.ensureProjectAccess(projectId, user);
    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      throw new NotFoundException('Invalid start or end date');
    }
    return this.prisma.sprint.create({
      data: {
        projectId,
        name: dto.name,
        goal: dto.goal,
        startDate,
        endDate,
        status: dto.status ?? SprintStatus.PLANNING,
      },
    });
  }

  async update(projectId: string, sprintId: string, user: UserWithRoles, dto: Partial<{ name: string; goal: string; startDate: string; endDate: string; status: SprintStatus }>) {
    await this.ensureSprintAccess(projectId, sprintId, user);
    const data: any = {};
    if (dto.name != null) data.name = dto.name;
    if (dto.goal != null) data.goal = dto.goal;
    if (dto.startDate != null) data.startDate = new Date(dto.startDate);
    if (dto.endDate != null) data.endDate = new Date(dto.endDate);
    if (dto.status != null) data.status = dto.status;
    return this.prisma.sprint.update({
      where: { id: sprintId },
      data,
    });
  }

  async remove(projectId: string, sprintId: string, user: UserWithRoles) {
    await this.ensureSprintAccess(projectId, sprintId, user);
    await this.prisma.task.updateMany({ where: { sprintId }, data: { sprintId: null } });
    return this.prisma.sprint.delete({ where: { id: sprintId } });
  }

  private async ensureProjectAccess(projectId: string, user: UserWithRoles) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, ...ScopeUtils.projectScope(user), deletedAt: null },
    });
    if (!project) throw new NotFoundException('Project not found');
    return project;
  }

  private async ensureSprintAccess(projectId: string, sprintId: string, user: UserWithRoles) {
    await this.ensureProjectAccess(projectId, user);
    const sprint = await this.prisma.sprint.findFirst({
      where: { id: sprintId, projectId },
    });
    if (!sprint) throw new NotFoundException('Sprint not found');
    return sprint;
  }
}
