import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { NotificationType } from '@prisma/client';
import { IntegrationsService } from '../integrations/integrations.service';
import { NotificationsGateway } from './notifications.gateway';

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly integrations: IntegrationsService,
    private readonly gateway: NotificationsGateway,
  ) {}

  async create(data: {
    orgId: string;
    userId: string;
    type: NotificationType;
    title: string;
    body?: string;
    linkUrl?: string;
    entityId?: string;
    entityType?: string;
  }) {
    const notification = await this.prisma.notification.create({
      data: {
        orgId: data.orgId,
        userId: data.userId,
        type: data.type,
        title: data.title,
        body: data.body,
        linkUrl: data.linkUrl,
        entityId: data.entityId,
        entityType: data.entityType,
      },
    });
    this.gateway.emitToUser(data.userId, {
      id: notification.id,
      title: data.title,
      body: data.body,
      linkUrl: data.linkUrl,
      type: data.type,
      entityId: data.entityId,
      entityType: data.entityType,
      createdAt: notification.createdAt.toISOString(),
    });
    this.integrations.sendSlackNotification(
      data.orgId,
      data.title,
      data.body,
      data.linkUrl,
    ).catch(() => {});
    return notification;
  }

  async findAllForUser(userId: string, unreadOnly = false, limit = 50) {
    return this.prisma.notification.findMany({
      where: { userId, ...(unreadOnly && { readAt: null }) },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async markRead(id: string, userId: string) {
    const n = await this.prisma.notification.findFirst({
      where: { id, userId },
    });
    if (!n) return null;
    return this.prisma.notification.update({
      where: { id },
      data: { readAt: new Date() },
    });
  }

  async markAllRead(userId: string) {
    await this.prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
    return { ok: true };
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.prisma.notification.count({
      where: { userId, readAt: null },
    });
  }

  async getPreferences(userId: string) {
    let prefs = await this.prisma.notificationPreference.findUnique({
      where: { userId },
    });
    if (!prefs) {
      prefs = await this.prisma.notificationPreference.create({
        data: {
          userId,
          emailTasks: true,
          emailFindings: true,
          emailInvoices: true,
          inApp: true,
        },
      });
    }
    return prefs;
  }

  async updatePreferences(userId: string, data: { emailTasks?: boolean; emailFindings?: boolean; emailInvoices?: boolean; inApp?: boolean }) {
    await this.prisma.notificationPreference.upsert({
      where: { userId },
      create: { userId, ...data },
      update: data,
    });
    return this.getPreferences(userId);
  }
}
