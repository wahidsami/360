import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { ScopeUtils, UserWithRoles } from '../common/utils/scope.utils';
import { ActivityService } from '../activity/activity.service';

@Injectable()
export class ProjectsService {
    constructor(
        private prisma: PrismaService,
        private activityService: ActivityService,
    ) { }

    async findAll(user: UserWithRoles, query: any) {
        const where: any = {
            ...ScopeUtils.clientScope(user, 'clientId'), // Apply RBAC Scope
            deletedAt: null,
        };

        if (query.clientId) where.clientId = query.clientId;
        if (query.status) where.status = query.status;
        if (query.health) where.health = query.health;
        if (query.q) {
            where.name = { contains: query.q, mode: 'insensitive' };
        }

        return this.prisma.project.findMany({
            where,
            include: { client: true, _count: { select: { tasks: true } } },
        });
    }

    async findOne(id: string, user: UserWithRoles) {
        const project = await this.prisma.project.findFirst({
            where: {
                id,
                ...ScopeUtils.clientScope(user, 'clientId'),
                deletedAt: null,
            },
            include: { client: true, members: true },
        });
        if (!project) throw new NotFoundException('Project not found');
        return project;
    }

    async create(user: UserWithRoles, createDto: any) {
        // Normalize status and health
        const data: any = { ...createDto };
        if (data.status) data.status = data.status.toUpperCase().replace(/-/g, '_');
        if (data.health) data.health = data.health.toUpperCase().replace(/-/g, '_');

        // strict mapping for Prisma
        const startDate = data.startDate ? new Date(data.startDate) : new Date();
        const endDate = data.deadline ? new Date(data.deadline) : new Date(startDate.getTime() + 30 * 24 * 60 * 60 * 1000);

        return this.prisma.project.create({
            data: {
                name: data.name,
                description: data.description,
                status: data.status,
                health: data.health,
                progress: typeof data.progress === 'number' ? data.progress : 0,
                budget: (data.budget !== undefined && data.budget !== null && data.budget !== '') ? parseFloat(data.budget.toString()) : null,
                tags: Array.isArray(data.tags) ? data.tags : [],
                startDate,
                org: { connect: { id: user.orgId } },
                client: { connect: { id: data.clientId } },
                members: {
                    create: {
                        userId: user.id,
                        role: user.role as any
                    }
                }
            },
        });
    }

    async update(id: string, user: UserWithRoles, updateDto: any) {
        // Verify project exists and user has access
        const project = await this.findOne(id, user);

        // Normalize status and health
        const data: any = { ...updateDto };
        if (data.status) data.status = data.status.toUpperCase().replace(/-/g, '_');
        if (data.health) data.health = data.health.toUpperCase().replace(/-/g, '_');

        // Clean up empty IDs to prevent FK constraint failures
        if (data.clientId === '') data.clientId = undefined; // Don't update if empty

        // Client roles cannot update projects
        const internalRoles = ['SUPER_ADMIN', 'OPS', 'PM', 'DEV'];
        if (!internalRoles.includes(user.role)) {
            throw new Error('Only internal staff can update projects');
        }

        // Construct update data strictly
        const updateData: any = {
            name: data.name,
            description: data.description,
            status: data.status,
            health: data.health,
            progress: typeof data.progress === 'number' ? data.progress : undefined,
            budget: (data.budget !== undefined && data.budget !== null && data.budget !== '') ? parseFloat(data.budget.toString()) : undefined,
            tags: Array.isArray(data.tags) ? data.tags : undefined,
            updatedAt: new Date()
        };

        if (data.startDate) updateData.startDate = new Date(data.startDate);
        if (data.endDate) updateData.endDate = new Date(data.endDate);
        if (data.deadline) updateData.endDate = new Date(data.deadline);

        // Handle clientId update
        if (data.clientId && data.clientId !== '') {
            updateData.client = { connect: { id: data.clientId } };
        }

        return this.prisma.project.update({
            where: { id },
            data: updateData
        });
    }

    async archive(id: string, user: UserWithRoles) {
        // Verify project exists and user has access
        await this.findOne(id, user);

        // Only SUPER_ADMIN, OPS, PM can archive
        const allowedRoles = ['SUPER_ADMIN', 'OPS', 'PM'];
        if (!allowedRoles.includes(user.role)) {
            throw new Error('Only SUPER_ADMIN, OPS, or PM can archive projects');
        }

        return this.prisma.project.update({
            where: { id },
            data: {
                status: 'ARCHIVED',
                updatedAt: new Date()
            }
        });
    }

    // --- Membership ---
    async getMembers(projectId: string) {
        return this.prisma.projectMember.findMany({
            where: { projectId },
            include: { user: { select: { id: true, name: true, email: true, role: true } } }
        });
    }

    async addMember(projectId: string, userId: string, role: any) {
        const project = await this.prisma.project.findUnique({ where: { id: projectId } });
        if (!project) throw new NotFoundException('Project not found');

        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user) throw new NotFoundException('User not found');

        // Check if already exists
        const existing = await this.prisma.projectMember.findFirst({
            where: { projectId, userId }
        });

        if (existing) {
            return this.prisma.projectMember.update({
                where: { id: existing.id },
                data: { role }
            });
        }

        return this.prisma.projectMember.create({
            data: {
                projectId,
                userId,
                role
            }
        });
    }

    async updateMemberRole(projectId: string, userId: string, role: any) {
        // Find exact record
        const member = await this.prisma.projectMember.findFirst({
            where: { projectId, userId }
        });

        if (!member) throw new NotFoundException('Member not found in project');

        return this.prisma.projectMember.update({
            where: { id: member.id },
            data: { role }
        });
    }

    async remove(id: string, user: UserWithRoles) {
        await this.findOne(id, user);
        return this.prisma.project.update({
            where: { id },
            data: { deletedAt: new Date() }
        });
    }

    async removeMember(projectId: string, userId: string) {
        const member = await this.prisma.projectMember.findFirst({
            where: { projectId, userId }
        });

        if (member) {
            await this.prisma.projectMember.delete({ where: { id: member.id } });
        }
        return { success: true };
    }

    async getActivity(projectId: string, user: UserWithRoles) {
        return this.activityService.findByProject(projectId, user);
    }
}
