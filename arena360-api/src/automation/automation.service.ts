import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AutomationTriggerEntity, AutomationTriggerEvent, AutomationActionType } from '@prisma/client';

export interface TriggerPayload {
  orgId: string;
  entityType: AutomationTriggerEntity;
  entityId: string;
  event: AutomationTriggerEvent;
  entity: Record<string, any>;
  previousEntity?: Record<string, any>;
}

@Injectable()
export class AutomationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async evaluateRules(payload: TriggerPayload): Promise<void> {
    const rules = await this.prisma.automationRule.findMany({
      where: {
        orgId: payload.orgId,
        isActive: true,
        triggerEntity: payload.entityType,
        triggerEvent: payload.event,
      },
    });
    for (const rule of rules) {
      try {
        const matches = this.matchesConditions(rule.triggerConditions as Record<string, any> | null, payload);
        if (!matches) continue;
        await this.runAction(rule, payload);
        await this.prisma.automationLog.create({
          data: {
            ruleId: rule.id,
            entityType: payload.entityType,
            entityId: payload.entityId,
            success: true,
          },
        });
      } catch (err: any) {
        await this.prisma.automationLog.create({
          data: {
            ruleId: rule.id,
            entityType: payload.entityType,
            entityId: payload.entityId,
            success: false,
            message: err?.message ?? String(err),
          },
        });
      }
    }
  }

  private matchesConditions(conditions: Record<string, any> | null, payload: TriggerPayload): boolean {
    if (!conditions || Object.keys(conditions).length === 0) return true;
    const entity = payload.entity;
    for (const [key, value] of Object.entries(conditions)) {
      const entityVal = entity[key];
      const normalized = typeof entityVal === 'string' ? entityVal.toUpperCase() : entityVal;
      const expected = typeof value === 'string' ? value.toUpperCase() : value;
      if (normalized !== expected) return false;
    }
    return true;
  }

  private interpolate(template: string, data: Record<string, any>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (_, key) => (data[key] != null ? String(data[key]) : ''));
  }

  private async runAction(rule: any, payload: TriggerPayload): Promise<void> {
    const config = rule.actionConfig as Record<string, any> || {};
    if (rule.actionType === AutomationActionType.CREATE_NOTIFICATION) {
      const userIdField = config.userIdField ?? 'assigneeId';
      const userId = payload.entity[userIdField];
      if (!userId) return;
      const title = this.interpolate(config.titleTemplate ?? 'Update', { ...payload.entity, title: payload.entity.title ?? 'Item' });
      const body = config.bodyTemplate ? this.interpolate(config.bodyTemplate, payload.entity) : undefined;
      const linkUrl = config.linkUrlTemplate ? this.interpolate(config.linkUrlTemplate, payload.entity) : undefined;
      await this.notifications.create({
        orgId: payload.orgId,
        userId,
        type: payload.entityType === AutomationTriggerEntity.TASK ? 'TASK_ASSIGNED' : payload.entityType === AutomationTriggerEntity.FINDING ? 'FINDING_ASSIGNED' : 'INVOICE_OVERDUE',
        title,
        body,
        linkUrl,
        entityId: payload.entityId,
        entityType: payload.entityType.toLowerCase(),
      });
    }
  }

  async listRules(orgId: string) {
    return this.prisma.automationRule.findMany({
      where: { orgId },
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { logs: true } } },
    });
  }

  async getRule(orgId: string, id: string) {
    const rule = await this.prisma.automationRule.findFirst({
      where: { id, orgId },
      include: { logs: { orderBy: { ranAt: 'desc' }, take: 50 } },
    });
    if (!rule) return null;
    return rule;
  }

  async createRule(orgId: string, data: {
    name: string;
    triggerEntity: AutomationTriggerEntity;
    triggerEvent: AutomationTriggerEvent;
    triggerConditions?: Record<string, any>;
    actionType?: AutomationActionType;
    actionConfig: Record<string, any>;
    isActive?: boolean;
  }) {
    return this.prisma.automationRule.create({
      data: {
        orgId,
        name: data.name,
        triggerEntity: data.triggerEntity,
        triggerEvent: data.triggerEvent,
        triggerConditions: data.triggerConditions ?? undefined,
        actionType: data.actionType ?? AutomationActionType.CREATE_NOTIFICATION,
        actionConfig: data.actionConfig,
        isActive: data.isActive ?? true,
      },
    });
  }

  async updateRule(orgId: string, id: string, data: Partial<{
    name: string;
    triggerEntity: AutomationTriggerEntity;
    triggerEvent: AutomationTriggerEvent;
    triggerConditions: Record<string, any>;
    actionType: AutomationActionType;
    actionConfig: Record<string, any>;
    isActive: boolean;
  }>) {
    await this.prisma.automationRule.findFirstOrThrow({ where: { id, orgId } });
    return this.prisma.automationRule.update({
      where: { id },
      data: {
        ...(data.name != null && { name: data.name }),
        ...(data.triggerEntity != null && { triggerEntity: data.triggerEntity }),
        ...(data.triggerEvent != null && { triggerEvent: data.triggerEvent }),
        ...(data.triggerConditions != null && { triggerConditions: data.triggerConditions }),
        ...(data.actionType != null && { actionType: data.actionType }),
        ...(data.actionConfig != null && { actionConfig: data.actionConfig }),
        ...(data.isActive != null && { isActive: data.isActive }),
      },
    });
  }

  async deleteRule(orgId: string, id: string) {
    await this.prisma.automationRule.findFirstOrThrow({ where: { id, orgId } });
    return this.prisma.automationRule.delete({ where: { id } });
  }
}
