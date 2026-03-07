import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { CustomFieldEntityType } from '@prisma/client';
import { PrismaService } from '../common/prisma.service';
import { UserWithRoles } from '../common/utils/scope.utils';
import { CreateCustomFieldDefDto, UpdateCustomFieldDefDto } from './dto/custom-field-def.dto';

@Injectable()
export class CustomFieldsService {
  constructor(private readonly prisma: PrismaService) {}

  private async ensureOrg(orgId: string, user: UserWithRoles) {
    if (user.orgId !== orgId) throw new ForbiddenException('Access denied');
  }

  async listDefs(orgId: string, user: UserWithRoles, entityType?: CustomFieldEntityType) {
    await this.ensureOrg(orgId, user);
    const where: { orgId: string; entityType?: CustomFieldEntityType } = { orgId };
    if (entityType) where.entityType = entityType;
    return this.prisma.customFieldDef.findMany({
      where,
      orderBy: [{ sortOrder: 'asc' }, { label: 'asc' }],
    });
  }

  async createDef(orgId: string, user: UserWithRoles, dto: CreateCustomFieldDefDto) {
    await this.ensureOrg(orgId, user);
    return this.prisma.customFieldDef.create({
      data: {
        orgId,
        entityType: dto.entityType as CustomFieldEntityType,
        key: dto.key,
        label: dto.label,
        fieldType: dto.fieldType as any,
        options: dto.options ? (dto.options as object) : undefined,
        required: dto.required ?? false,
        sortOrder: dto.sortOrder ?? 0,
      },
    });
  }

  async updateDef(orgId: string, id: string, user: UserWithRoles, dto: UpdateCustomFieldDefDto) {
    await this.ensureOrg(orgId, user);
    const existing = await this.prisma.customFieldDef.findFirst({ where: { id, orgId } });
    if (!existing) throw new NotFoundException('Custom field not found');
    return this.prisma.customFieldDef.update({
      where: { id },
      data: {
        ...(dto.label != null && { label: dto.label }),
        ...(dto.fieldType != null && { fieldType: dto.fieldType as any }),
        ...(dto.options !== undefined && { options: dto.options as object }),
        ...(dto.required != null && { required: dto.required }),
        ...(dto.sortOrder != null && { sortOrder: dto.sortOrder }),
      },
    });
  }

  async deleteDef(orgId: string, id: string, user: UserWithRoles) {
    await this.ensureOrg(orgId, user);
    const existing = await this.prisma.customFieldDef.findFirst({ where: { id, orgId } });
    if (!existing) throw new NotFoundException('Custom field not found');
    return this.prisma.customFieldDef.delete({ where: { id } });
  }

  async getValues(orgId: string, entityType: CustomFieldEntityType, entityId: string, user: UserWithRoles) {
    await this.ensureOrg(orgId, user);
    await this.ensureEntityAccess(orgId, entityType, entityId, user);
    const defs = await this.prisma.customFieldDef.findMany({
      where: { orgId, entityType },
      orderBy: [{ sortOrder: 'asc' }, { label: 'asc' }],
    });
    const values = await this.prisma.customFieldValue.findMany({
      where: { orgId, entityType, entityId },
    });
    const valueMap = new Map(values.map((v) => [v.fieldDefId, v.value]));
    return defs.map((d) => ({
      fieldDefId: d.id,
      key: d.key,
      label: d.label,
      fieldType: d.fieldType,
      options: d.options,
      required: d.required,
      value: valueMap.get(d.id) ?? null,
    }));
  }

  async setValues(
    orgId: string,
    entityType: CustomFieldEntityType,
    entityId: string,
    user: UserWithRoles,
    values: Record<string, string | number | boolean | null>,
  ) {
    await this.ensureOrg(orgId, user);
    await this.ensureEntityAccess(orgId, entityType, entityId, user);
    const defs = await this.prisma.customFieldDef.findMany({
      where: { orgId, entityType },
    });
    const defMap = new Map(defs.map((d) => [d.id, d]));
    for (const [fieldDefId, rawValue] of Object.entries(values)) {
      if (!defMap.has(fieldDefId)) continue;
      const value = rawValue === null || rawValue === undefined ? null : String(rawValue);
      await this.prisma.customFieldValue.upsert({
        where: {
          fieldDefId_entityId: { fieldDefId, entityId },
        },
        create: {
          orgId,
          fieldDefId,
          entityType,
          entityId,
          value,
        },
        update: { value },
      });
    }
    return this.getValues(orgId, entityType, entityId, user);
  }

  private async ensureEntityAccess(
    orgId: string,
    entityType: CustomFieldEntityType,
    entityId: string,
    user: UserWithRoles,
  ) {
    if (entityType === 'PROJECT') {
      const project = await this.prisma.project.findFirst({
        where: { id: entityId, orgId, deletedAt: null },
      });
      if (!project) throw new NotFoundException('Project not found');
      return;
    }
    if (entityType === 'TASK') {
      const task = await this.prisma.task.findFirst({
        where: { id: entityId },
        include: { project: true },
      });
      if (!task || task.project.orgId !== orgId) throw new NotFoundException('Task not found');
      return;
    }
    if (entityType === 'CLIENT') {
      const client = await this.prisma.client.findFirst({
        where: { id: entityId, orgId },
      });
      if (!client) throw new NotFoundException('Client not found');
      return;
    }
    throw new ForbiddenException('Invalid entity type');
  }
}
