import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { UserWithRoles } from '../common/utils/scope.utils';
import { CreateMilestoneDto, UpdateMilestoneDto } from './dto/milestone.dto';
import { CreateProjectUpdateDto } from './dto/project-update.dto';

@Injectable()
export class MilestonesService {
    constructor(private prisma: PrismaService) { }

    // === MILESTONES ===

    async findAllMilestones(projectId: string, user: UserWithRoles) {
        // Verify user has access to this project
        await this.verifyProjectAccess(projectId, user);

        return this.prisma.milestone.findMany({
            where: {
                projectId,
                orgId: user.orgId
            },
            include: {
                owner: {
                    select: { id: true, name: true, email: true }
                }
            },
            orderBy: { dueDate: 'asc' }
        });
    }

    async createMilestone(projectId: string, user: UserWithRoles, dto: CreateMilestoneDto) {
        // Verify user has access to this project
        await this.verifyProjectAccess(projectId, user);

        // Only internal roles can create milestones
        const internalRoles = ['SUPER_ADMIN', 'OPS', 'PM', 'DEV'];
        if (!internalRoles.includes(user.role)) {
            throw new ForbiddenException('Only internal staff can create milestones');
        }

        const data: any = { ...dto };
        if (data.ownerId === '') data.ownerId = null;

        // Ensure dueDate is a valid Date
        let dueDate: Date;
        if (data.dueDate) {
            dueDate = new Date(data.dueDate);
            if (isNaN(dueDate.getTime())) {
                throw new Error('Invalid dueDate format');
            }
        } else {
            throw new Error('dueDate is required');
        }

        // Strip extra fields
        const { id, orgId: dOrgId, projectId: dProjId, createdAt, updatedAt, deletedAt, owner, project, tasks, ...rest } = data;

        return this.prisma.milestone.create({
            data: {
                ...rest,
                dueDate,
                projectId,
                orgId: user.orgId
            },
            include: {
                owner: {
                    select: { id: true, name: true, email: true }
                }
            }
        });
    }

    async updateMilestone(projectId: string, milestoneId: string, user: UserWithRoles, dto: UpdateMilestoneDto) {
        // Verify milestone exists and belongs to project
        const milestone = await this.prisma.milestone.findFirst({
            where: {
                id: milestoneId,
                projectId,
                orgId: user.orgId
            }
        });

        if (!milestone) {
            throw new NotFoundException('Milestone not found');
        }

        // Only internal roles can update milestones
        const internalRoles = ['SUPER_ADMIN', 'OPS', 'PM', 'DEV'];
        if (!internalRoles.includes(user.role)) {
            throw new ForbiddenException('Only internal staff can update milestones');
        }

        const data: any = { ...dto };
        if (data.ownerId === '') data.ownerId = null;

        // Strip extra fields
        const { id, orgId: dOrgId, projectId: dProjId, createdAt, updatedAt, deletedAt, owner, project, tasks, ...rest } = data;
        const updateData: any = { ...rest };

        // Handle dueDate strictly
        if (data.dueDate) {
            const d = new Date(data.dueDate);
            if (!isNaN(d.getTime())) {
                updateData.dueDate = d;
            }
        }

        return this.prisma.milestone.update({
            where: { id: milestoneId },
            data: updateData,
            include: {
                owner: {
                    select: { id: true, name: true, email: true }
                }
            }
        });
    }

    async deleteMilestone(projectId: string, milestoneId: string, user: UserWithRoles) {
        // Verify milestone exists and belongs to project
        const milestone = await this.prisma.milestone.findFirst({
            where: {
                id: milestoneId,
                projectId,
                orgId: user.orgId
            }
        });

        if (!milestone) {
            throw new NotFoundException('Milestone not found');
        }

        // Only internal roles can delete milestones
        const internalRoles = ['SUPER_ADMIN', 'OPS', 'PM'];
        if (!internalRoles.includes(user.role)) {
            throw new ForbiddenException('Only SUPER_ADMIN, OPS, or PM can delete milestones');
        }

        await this.prisma.milestone.delete({
            where: { id: milestoneId }
        });
    }

    // === PROJECT UPDATES ===

    async findAllUpdates(projectId: string, user: UserWithRoles) {
        // Verify user has access to this project
        await this.verifyProjectAccess(projectId, user);

        const clientRoles = ['CLIENT_OWNER', 'CLIENT_MANAGER', 'CLIENT_MEMBER'];
        const isClientUser = clientRoles.includes(user.role);

        return this.prisma.projectUpdate.findMany({
            where: {
                projectId,
                orgId: user.orgId,
                // Client users only see CLIENT visibility updates
                ...(isClientUser && { visibility: 'CLIENT' })
            },
            include: {
                author: {
                    select: { id: true, name: true, email: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
    }

    async createUpdate(projectId: string, user: UserWithRoles, dto: CreateProjectUpdateDto) {
        // Verify user has access to this project
        await this.verifyProjectAccess(projectId, user);

        // Only internal roles can create updates
        const internalRoles = ['SUPER_ADMIN', 'OPS', 'PM', 'DEV'];
        if (!internalRoles.includes(user.role)) {
            throw new ForbiddenException('Only internal staff can create project updates');
        }

        // DEV can only create INTERNAL updates
        // PM/OPS/SUPER_ADMIN can create both INTERNAL and CLIENT updates
        let visibility = dto.visibility || 'INTERNAL';
        if (user.role === 'DEV' && visibility === 'CLIENT') {
            throw new ForbiddenException('DEV role can only create INTERNAL updates');
        }

        return this.prisma.projectUpdate.create({
            data: {
                ...dto,
                visibility,
                projectId,
                authorId: user.id,
                orgId: user.orgId
            },
            include: {
                author: {
                    select: { id: true, name: true, email: true }
                }
            }
        });
    }

    // Helper method to verify project access
    private async verifyProjectAccess(projectId: string, user: UserWithRoles) {
        const project = await this.prisma.project.findFirst({
            where: {
                id: projectId,
                orgId: user.orgId
            }
        });

        if (!project) {
            throw new NotFoundException('Project not found');
        }

        return project;
    }
}
