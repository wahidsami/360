import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { UserWithRoles } from '../common/utils/scope.utils';
import {
  AssignClientWorkspaceTemplateDto,
  CreateProjectWorkspaceTemplateDto,
  UpdateClientWorkspaceTemplateAssignmentDto,
  UpdateProjectWorkspaceTemplateDto,
} from './dto/project-workspace.dto';

@Injectable()
export class ProjectWorkspaceService {
  constructor(private readonly prisma: PrismaService) {}

  private async ensureClientInOrg(clientId: string, orgId: string) {
    const client = await this.prisma.client.findFirst({
      where: { id: clientId, orgId, deletedAt: null },
    });
    if (!client) throw new NotFoundException('Client not found');
    return client;
  }

  private async ensureTemplateInOrg(templateId: string, orgId: string) {
    const template = await this.prisma.projectWorkspaceTemplate.findFirst({
      where: { id: templateId, orgId },
    });
    if (!template) throw new NotFoundException('Workspace template not found');
    return template;
  }

  private sanitizeDefinitionJson(definitionJson: Record<string, unknown>) {
    const tabs = Array.isArray(definitionJson?.tabs) ? definitionJson.tabs : [];
    const overviewSections = Array.isArray(definitionJson?.overviewSections) ? definitionJson.overviewSections : [];

    return {
      tabs,
      overviewSections,
    };
  }

  async listTemplates(orgId: string) {
    return this.prisma.projectWorkspaceTemplate.findMany({
      where: { orgId },
      include: {
        _count: {
          select: {
            assignments: true,
            projectConfigs: true,
          },
        },
      },
      orderBy: [{ isDefault: 'desc' }, { updatedAt: 'desc' }],
    });
  }

  async createTemplate(orgId: string, user: UserWithRoles, dto: CreateProjectWorkspaceTemplateDto) {
    const definitionJson = this.sanitizeDefinitionJson(dto.definitionJson);
    if (definitionJson.tabs.length === 0) {
      throw new BadRequestException('Workspace template must include at least one tab configuration.');
    }

    return this.prisma.$transaction(async (tx) => {
      if (dto.isDefault) {
        await tx.projectWorkspaceTemplate.updateMany({
          where: { orgId },
          data: { isDefault: false },
        });
      }

      return tx.projectWorkspaceTemplate.create({
        data: {
          orgId,
          name: dto.name.trim(),
          description: dto.description?.trim() || null,
          audienceType: dto.audienceType ?? 'CLIENT',
          status: dto.status ?? 'DRAFT',
          isDefault: dto.isDefault ?? false,
          definitionJson,
          createdById: user.id,
        },
      });
    });
  }

  async updateTemplate(orgId: string, templateId: string, dto: UpdateProjectWorkspaceTemplateDto) {
    await this.ensureTemplateInOrg(templateId, orgId);

    return this.prisma.$transaction(async (tx) => {
      if (dto.isDefault) {
        await tx.projectWorkspaceTemplate.updateMany({
          where: { orgId, id: { not: templateId } },
          data: { isDefault: false },
        });
      }

      return tx.projectWorkspaceTemplate.update({
        where: { id: templateId },
        data: {
          ...(dto.name !== undefined && { name: dto.name.trim() }),
          ...(dto.description !== undefined && { description: dto.description?.trim() || null }),
          ...(dto.audienceType !== undefined && { audienceType: dto.audienceType }),
          ...(dto.status !== undefined && { status: dto.status }),
          ...(dto.isDefault !== undefined && { isDefault: dto.isDefault }),
          ...(dto.definitionJson !== undefined && { definitionJson: this.sanitizeDefinitionJson(dto.definitionJson) }),
        },
      });
    });
  }

  async listClientAssignments(orgId: string, clientId: string) {
    await this.ensureClientInOrg(clientId, orgId);
    return this.prisma.clientWorkspaceTemplateAssignment.findMany({
      where: { orgId, clientId },
      include: {
        template: true,
      },
      orderBy: [{ isDefault: 'desc' }, { assignedAt: 'desc' }],
    });
  }

  async createClientAssignment(
    orgId: string,
    clientId: string,
    user: UserWithRoles,
    dto: AssignClientWorkspaceTemplateDto,
  ) {
    await this.ensureClientInOrg(clientId, orgId);
    await this.ensureTemplateInOrg(dto.templateId, orgId);

    return this.prisma.$transaction(async (tx) => {
      if (dto.isDefault) {
        await tx.clientWorkspaceTemplateAssignment.updateMany({
          where: { orgId, clientId },
          data: { isDefault: false },
        });
      }

      return tx.clientWorkspaceTemplateAssignment.upsert({
        where: {
          clientId_templateId: {
            clientId,
            templateId: dto.templateId,
          },
        },
        update: {
          isDefault: dto.isDefault ?? false,
          isActive: dto.isActive ?? true,
          assignedById: user.id,
          assignedAt: new Date(),
        },
        create: {
          orgId,
          clientId,
          templateId: dto.templateId,
          isDefault: dto.isDefault ?? false,
          isActive: dto.isActive ?? true,
          assignedById: user.id,
        },
        include: {
          template: true,
        },
      });
    });
  }

  async updateClientAssignment(
    orgId: string,
    assignmentId: string,
    dto: UpdateClientWorkspaceTemplateAssignmentDto,
    user?: UserWithRoles,
  ) {
    const assignment = await this.prisma.clientWorkspaceTemplateAssignment.findFirst({
      where: { id: assignmentId, orgId },
    });
    if (!assignment) throw new NotFoundException('Workspace template assignment not found');

    return this.prisma.$transaction(async (tx) => {
      if (dto.isDefault) {
        await tx.clientWorkspaceTemplateAssignment.updateMany({
          where: {
            orgId,
            clientId: assignment.clientId,
            id: { not: assignmentId },
          },
          data: { isDefault: false },
        });
      }

      return tx.clientWorkspaceTemplateAssignment.update({
        where: { id: assignmentId },
        data: {
          ...(dto.isDefault !== undefined && { isDefault: dto.isDefault }),
          ...(dto.isActive !== undefined && { isActive: dto.isActive }),
          ...(user?.id && { assignedById: user.id }),
          assignedAt: new Date(),
        },
        include: {
          template: true,
        },
      });
    });
  }

  async getDefaultClientTemplateDraft(orgId: string, clientId: string) {
    await this.ensureClientInOrg(clientId, orgId);

    const assignment =
      (await this.prisma.clientWorkspaceTemplateAssignment.findFirst({
        where: { orgId, clientId, isActive: true, isDefault: true },
        include: { template: true },
        orderBy: [{ assignedAt: 'desc' }],
      })) ||
      (await this.prisma.clientWorkspaceTemplateAssignment.findFirst({
        where: { orgId, clientId, isActive: true },
        include: { template: true },
        orderBy: [{ assignedAt: 'desc' }],
      }));

    if (!assignment) {
      return null;
    }

    const definitionJson = this.sanitizeDefinitionJson((assignment.template.definitionJson || {}) as Record<string, unknown>);

    return {
      sourceTemplateId: assignment.templateId,
      assignedClientId: clientId,
      audienceType: assignment.template.audienceType.toLowerCase(),
      tabs: definitionJson.tabs,
      overviewSections: definitionJson.overviewSections,
    };
  }
}
