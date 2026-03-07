import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { SLAEntityType, SLATrackerStatus } from '@prisma/client';
import { PrismaService } from '../common/prisma.service';
import { UserWithRoles } from '../common/utils/scope.utils';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateSLAPolicyDto, UpdateSLAPolicyDto } from './dto/sla.dto';

@Injectable()
export class SlaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  private async ensureOrg(orgId: string, user: UserWithRoles) {
    if (user.orgId !== orgId) throw new ForbiddenException('Access denied');
  }

  async listPolicies(orgId: string, user: UserWithRoles, entityType?: SLAEntityType) {
    await this.ensureOrg(orgId, user);
    const where: { orgId: string; entityType?: SLAEntityType } = { orgId };
    if (entityType) where.entityType = entityType;
    return this.prisma.sLAPolicy.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { trackers: true } } },
    });
  }

  async createPolicy(orgId: string, user: UserWithRoles, dto: CreateSLAPolicyDto) {
    await this.ensureOrg(orgId, user);
    return this.prisma.sLAPolicy.create({
      data: {
        orgId,
        name: dto.name,
        entityType: dto.entityType as SLAEntityType,
        targetHours: dto.targetHours,
        clientId: dto.clientId ?? null,
        enabled: dto.enabled ?? true,
      },
    });
  }

  async updatePolicy(orgId: string, id: string, user: UserWithRoles, dto: UpdateSLAPolicyDto) {
    await this.ensureOrg(orgId, user);
    const existing = await this.prisma.sLAPolicy.findFirst({ where: { id, orgId } });
    if (!existing) throw new NotFoundException('SLA policy not found');
    return this.prisma.sLAPolicy.update({
      where: { id },
      data: {
        ...(dto.name != null && { name: dto.name }),
        ...(dto.targetHours != null && { targetHours: dto.targetHours }),
        ...(dto.clientId !== undefined && { clientId: dto.clientId || null }),
        ...(dto.enabled != null && { enabled: dto.enabled }),
      },
    });
  }

  async deletePolicy(orgId: string, id: string, user: UserWithRoles) {
    await this.ensureOrg(orgId, user);
    const existing = await this.prisma.sLAPolicy.findFirst({ where: { id, orgId } });
    if (!existing) throw new NotFoundException('SLA policy not found');
    await this.prisma.sLATracker.deleteMany({ where: { policyId: id } });
    return this.prisma.sLAPolicy.delete({ where: { id } });
  }

  async listTrackers(orgId: string, user: UserWithRoles, filters?: { policyId?: string; entityType?: string; entityId?: string; status?: SLATrackerStatus }) {
    await this.ensureOrg(orgId, user);
    const where: { orgId: string; policyId?: string; entityType?: SLAEntityType; entityId?: string; status?: SLATrackerStatus } = { orgId };
    if (filters?.policyId) where.policyId = filters.policyId;
    if (filters?.entityType) where.entityType = filters.entityType as SLAEntityType;
    if (filters?.entityId) where.entityId = filters.entityId;
    if (filters?.status) where.status = filters.status;
    return this.prisma.sLATracker.findMany({
      where,
      orderBy: { dueAt: 'asc' },
      include: { policy: true },
    });
  }

  /** Start or update SLA tracker for an entity (call from tasks/findings/invoices when created or status changes). */
  async startOrUpdateTracker(
    orgId: string,
    entityType: SLAEntityType,
    entityId: string,
    options?: { clientId?: string },
  ) {
    const policies = await this.prisma.sLAPolicy.findMany({
      where: {
        orgId,
        entityType,
        enabled: true,
        OR: [{ clientId: null }, options?.clientId ? { clientId: options.clientId } : {}],
      },
    });
    const now = new Date();
    for (const policy of policies) {
      const dueAt = new Date(now.getTime() + policy.targetHours * 60 * 60 * 1000);
      await this.prisma.sLATracker.upsert({
        where: { policyId_entityId: { policyId: policy.id, entityId } },
        create: {
          orgId,
          policyId: policy.id,
          entityType,
          entityId,
          dueAt,
          status: SLATrackerStatus.PENDING,
        },
        update: { dueAt, status: SLATrackerStatus.PENDING, breachedAt: null, notifiedAt: null },
      });
    }
  }

  /** Mark SLA as met (e.g. when task/finding is closed). */
  async markMet(orgId: string, entityType: SLAEntityType, entityId: string) {
    await this.prisma.sLATracker.updateMany({
      where: { orgId, entityType, entityId, status: SLATrackerStatus.PENDING },
      data: { status: SLATrackerStatus.MET },
    });
  }

  /** Check for breached SLAs and send notifications. Call from cron or manually. */
  async checkBreaches(orgId: string) {
    const now = new Date();
    const breached = await this.prisma.sLATracker.findMany({
      where: {
        orgId,
        status: SLATrackerStatus.PENDING,
        dueAt: { lt: now },
      },
      include: { policy: true },
    });
    for (const t of breached) {
      await this.prisma.sLATracker.update({
        where: { id: t.id },
        data: { status: SLATrackerStatus.BREACHED, breachedAt: now },
      });
      // Notify org admins / assignees - use first user with OPS or SUPER_ADMIN for simplicity, or broadcast
      const users = await this.prisma.user.findMany({
        where: { orgId, isActive: true, role: { in: ['OPS', 'SUPER_ADMIN'] } },
        take: 20,
      });
      const title = `SLA breached: ${t.policy.name}`;
      const body = `Entity ${t.entityType} ${t.entityId} passed due time at ${t.dueAt.toISOString()}.`;
      const linkUrl = `/app/projects?entity=${t.entityType}&id=${t.entityId}`;
      for (const u of users) {
        await this.notifications
          .create({
            orgId,
            userId: u.id,
            type: 'SLA_BREACH',
            title,
            body,
            linkUrl,
            entityId: t.entityId,
            entityType: t.entityType,
          })
          .catch(() => {});
      }
      await this.prisma.sLATracker.update({
        where: { id: t.id },
        data: { notifiedAt: now },
      });
    }
    return { checked: breached.length };
  }
}
