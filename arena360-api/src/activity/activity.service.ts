import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { ScopeUtils, UserWithRoles } from '../common/utils/scope.utils';

@Injectable()
export class ActivityService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    orgId: string;
    projectId?: string;
    userId: string;
    action: string;
    entityType: string;
    entityId?: string;
    description: string;
    metadata?: Record<string, unknown>;
  }) {
    return this.prisma.activityFeed.create({
      data: {
        orgId: data.orgId,
        projectId: data.projectId,
        userId: data.userId,
        action: data.action,
        entityType: data.entityType,
        entityId: data.entityId,
        description: data.description,
        metadata: data.metadata ? (data.metadata as object) : undefined,
      },
    });
  }

  async findByProject(projectId: string, user: UserWithRoles, limit = 50) {
    const project = await this.prisma.project.findFirst({
      where: {
        id: projectId,
        ...ScopeUtils.clientScope(user, 'clientId'),
        deletedAt: null,
      },
    });
    if (!project) throw new NotFoundException('Project not found');
    const feeds = await this.prisma.activityFeed.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    const userIds = [...new Set(feeds.map((f) => f.userId))];
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true },
    });
    const userMap = new Map(users.map((u) => [u.id, u.name]));
    return feeds.map((f) => ({
      id: f.id,
      entityId: f.entityId ?? f.id,
      action: f.action,
      description: f.description,
      userId: f.userId,
      userName: userMap.get(f.userId) ?? 'Unknown',
      timestamp: f.createdAt.toISOString(),
      type: f.entityType as 'file' | 'update' | 'comment' | 'system',
      metadata: f.metadata,
    }));
  }
}
