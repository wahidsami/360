import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { ScopeUtils, UserWithRoles } from '../common/utils/scope.utils';
import { StorageService } from '../common/storage.service';
import { GlobalRole } from '@prisma/client';

@Injectable()
export class ClientsService {
    constructor(
        private prisma: PrismaService,
        private storage: StorageService
    ) { }

    private async resolveLogoUrl(logoId: string | null | undefined): Promise<string | undefined> {
        if (!logoId) return undefined;
        // If it looks like a URL already, return it
        if (logoId.startsWith('http')) return logoId;

        try {
            const file = await this.prisma.fileAsset.findUnique({
                where: { id: logoId }
            });
            if (file) {
                return this.storage.getSignedUrl(file.storageKey, 3600);
            }
        } catch (e) {
            console.error('Failed to resolve logo URL:', e);
        }
        return undefined;
    }

    async create(user: UserWithRoles, createClientDto: any) {
        // Enforce: Only internal roles can create clients
        const internalRoles: GlobalRole[] = ['SUPER_ADMIN', 'OPS', 'PM', 'DEV', 'QA'];
        if (!internalRoles.includes(user.role)) {
            // For now, allow it but ideally throw ForbiddenException
            // throw new ForbiddenException('Only internal staff can create clients');
        }

        // Normalize status
        const status = createClientDto.status ? createClientDto.status.toUpperCase().replace(/-/g, '_') : undefined;

        return this.prisma.client.create({
            data: {
                name: createClientDto.name,
                industry: createClientDto.industry,
                contactPerson: createClientDto.contactPerson,
                email: createClientDto.email,
                phone: createClientDto.phone,
                website: createClientDto.website,
                address: createClientDto.address,
                notes: createClientDto.notes,
                status: status as any,
                billing: createClientDto.billing || undefined,
                org: { connect: { id: user.orgId } },
                // revenueYTD & outstandingBalance default to 0
                lastActivity: new Date(),
            },
        });
    }

    async findAll(user: UserWithRoles, query: any = {}) {
        const where: any = {
            ...ScopeUtils.clientScope(user, 'id'),
            deletedAt: null
        };
        
        if (query.includeArchived !== 'true') {
            where.status = { not: 'ARCHIVED' };
        }

        const clients = await this.prisma.client.findMany({
            where,
            include: {
                projects: {
                    select: { id: true, status: true, health: true }
                },
                members: true
            },
            orderBy: { updatedAt: 'desc' }
        });

        // Transform for frontend if needed (e.g. activeProjects count)
        return Promise.all(clients.map(async (c: any) => ({
            ...c,
            activeProjects: c.projects.filter((p: any) => p.status === 'ACTIVE').length,
            logoUrl: await this.resolveLogoUrl(c.logo)
        })));
    }

    async findOne(id: string, user: UserWithRoles) {
        const clientScope = ScopeUtils.clientScope(user, 'id');
        const client = await this.prisma.client.findFirst({
            where: {
                orgId: user.orgId,
                deletedAt: null,
                AND: [
                    { id },
                    clientScope.id ? { id: clientScope.id } : {},
                ],
            },
            include: {
                projects: true,
                members: {
                    include: { user: true }
                }
            },
        });
        if (!client) throw new NotFoundException('Client not found');
        return {
            ...(client as any),
            logoUrl: await this.resolveLogoUrl((client as any).logo)
        };
    }

    async update(id: string, user: UserWithRoles, updateClientDto: any) {
        // Verify existence and scope first
        await this.findOne(id, user);

        // Normalize status
        const data: any = { ...updateClientDto };
        if (data.status) data.status = data.status.toUpperCase().replace(/-/g, '_');

        return this.prisma.client.update({
            where: { id },
            data: {
                name: data.name,
                industry: data.industry,
                contactPerson: data.contactPerson,
                email: data.email,
                phone: data.phone,
                website: data.website,
                address: data.address,
                notes: data.notes,
                status: data.status,
                billing: data.billing,
                logo: data.logo,
                updatedAt: new Date()
            }
        });
    }

    async archive(id: string, user: UserWithRoles) {
        await this.findOne(id, user);
        return this.prisma.client.update({
            where: { id },
            data: { status: 'ARCHIVED' }
        });
    }

    async restore(id: string, user: UserWithRoles) {
        await this.findOne(id, user);
        return this.prisma.client.update({
            where: { id },
            data: { status: 'ACTIVE' }
        });
    }

    // --- Membership ---
    async getMembers(clientId: string) {
        return this.prisma.clientMember.findMany({
            where: { clientId },
            include: { user: { select: { id: true, name: true, email: true, role: true } } }
        });
    }

    async addMember(clientId: string, userId: string, role: any) {
        const client = await this.prisma.client.findUnique({ where: { id: clientId } });
        if (!client) throw new NotFoundException('Client not found');

        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user) throw new NotFoundException('User not found');

        // Check if already exists
        const existing = await this.prisma.clientMember.findFirst({
            where: { clientId, userId }
        });

        if (existing) {
            return this.prisma.clientMember.update({
                where: { id: existing.id },
                data: { role }
            });
        }

        return this.prisma.clientMember.create({
            data: {
                clientId,
                userId,
                role
            }
        });
    }

    async updateMemberRole(clientId: string, userId: string, role: any) {
        // Find exact record
        const member = await this.prisma.clientMember.findFirst({
            where: { clientId, userId }
        });

        if (!member) throw new NotFoundException('Member not found in client');

        return this.prisma.clientMember.update({
            where: { id: member.id },
            data: { role }
        });
    }

    async remove(id: string, user: UserWithRoles) {
        await this.findOne(id, user); // Verify existence/access
        return this.prisma.client.update({
            where: { id },
            data: { deletedAt: new Date() }
        });
    }

    async removeMember(clientId: string, userId: string) {
        const member = await this.prisma.clientMember.findFirst({
            where: { clientId, userId }
        });

        if (member) {
            await this.prisma.clientMember.delete({ where: { id: member.id } });
        }
        return { success: true };
    }
}

