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
  ) { }

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
    return template.replace(/\{\{([\w.]+)\}\}/g, (_, key) => {
      const parts = key.split('.');
      let val: any = data;
      for (const part of parts) {
        val = val?.[part];
      }
      return val != null ? String(val) : '';
    });
  }

  private async runAction(rule: any, payload: TriggerPayload): Promise<void> {
    const config = rule.actionConfig as Record<string, any> || {};
    if (rule.actionType === AutomationActionType.CREATE_NOTIFICATION) {
      const userIdField = config.userIdField ?? 'assigneeId';
      let userId = payload.entity[userIdField];

      // fallback: if the field is not on the entity, check if it's a static ID
      if (!userId && (userIdField.length === 25 || userIdField.length === 36)) {
        userId = userIdField;
      }

      if (!userId) return;

      // Smarter defaults based on entity
      let defaultTitle = 'Update';
      let defaultLink = '/app/dashboard';
      let type: any = 'TASK_ASSIGNED';

      if (payload.entityType === AutomationTriggerEntity.TASK) {
        defaultTitle = payload.entity.title || 'Task Update';
        defaultLink = `/app/projects/${payload.entity.projectId}?tab=tasks`;
        type = payload.event === AutomationTriggerEvent.STATUS_CHANGED ? 'TASK_STATUS_CHANGE' : 'TASK_ASSIGNED';
      } else if (payload.entityType === AutomationTriggerEntity.FINDING) {
        defaultTitle = payload.entity.title || 'Finding Update';
        defaultLink = `/app/projects/${payload.entity.projectId}?tab=findings`;
        type = payload.event === AutomationTriggerEvent.STATUS_CHANGED ? 'FINDING_STATUS_CHANGE' : 'FINDING_ASSIGNED';
      } else if (payload.entityType === AutomationTriggerEntity.INVOICE) {
        defaultTitle = payload.entity.invoiceNumber || 'Invoice Update';
        defaultLink = `/app/projects/${payload.entity.projectId}?tab=financials`;
        type = 'INVOICE_OVERDUE';
      }

      const title = this.interpolate(config.titleTemplate || defaultTitle, { ...payload.entity, title: payload.entity.title || 'Item' });
      const body = config.bodyTemplate ? this.interpolate(config.bodyTemplate, payload.entity) : undefined;
      const linkUrl = this.interpolate(config.linkUrlTemplate || defaultLink, payload.entity);

      await this.notifications.create({
        orgId: payload.orgId,
        userId,
        type,
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
