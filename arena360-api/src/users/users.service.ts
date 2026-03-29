import { Injectable, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PrismaService } from '../common/prisma.service';
import * as bcrypt from 'bcrypt';
import { User, GlobalRole, Prisma } from '@prisma/client';

const safeUserSelect = Prisma.validator<Prisma.UserSelect>()({
    id: true,
    email: true,
    name: true,
    role: true,
    avatar: true,
    isActive: true,
    orgId: true,
    customPermissions: true,
    twoFactorEnabled: true,
    dashboardPreferences: true,
    createdAt: true,
    updatedAt: true,
});

const adminUserSelect = Prisma.validator<Prisma.UserSelect>()({
    id: true,
    email: true,
    name: true,
    role: true,
    avatar: true,
    isActive: true,
    orgId: true,
    customPermissions: true,
    twoFactorEnabled: true,
    dashboardPreferences: true,
    createdAt: true,
    updatedAt: true,
    clientMemberships: {
        select: {
            id: true,
            clientId: true,
            role: true,
            createdAt: true,
            client: {
                select: {
                    id: true,
                    name: true,
                    status: true,
                }
            }
        }
    },
    invites: {
        orderBy: { createdAt: 'desc' },
        select: {
            id: true,
            createdAt: true,
            expiresAt: true,
            usedAt: true,
        }
    }
});

type SafeUser = Prisma.UserGetPayload<{ select: typeof safeUserSelect }>;
type AdminUserRecord = Prisma.UserGetPayload<{ select: typeof adminUserSelect }>;

import { EmailService } from '../email/email.service';

@Injectable()
export class UsersService {
    constructor(
        private prisma: PrismaService,
        private emailService: EmailService
    ) { }

    private async resolveOrgId(orgId: string): Promise<string> {
        if (orgId) {
            return orgId;
        }

        const defaultOrg = await this.prisma.org.findFirst();
        return defaultOrg?.id || orgId;
    }

    private buildInviteLink(inviteToken: string): string {
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        return `${frontendUrl}/#/accept-invite?token=${inviteToken}`;
    }

    private async issueInvite(
        userId: string,
        email: string,
        currentUserId?: string,
    ): Promise<{ inviteLink: string; expiresAt: Date; emailSent: boolean; emailError?: string }> {
        const crypto = require('crypto');
        const inviteToken = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000);

        await this.prisma.userInvite.updateMany({
            where: {
                userId,
                usedAt: null,
            },
            data: {
                expiresAt: new Date(),
            },
        });

        await this.prisma.userInvite.create({
            data: {
                userId,
                tokenHash: crypto.createHash('sha256').update(inviteToken).digest('hex'),
                expiresAt,
                createdById: currentUserId,
            }
        });

        const inviteLink = this.buildInviteLink(inviteToken);

        let emailSent = true;
        let emailError: string | undefined;
        try {
            await this.emailService.sendInvite(email, inviteLink, 'Arena360');
        } catch (error) {
            console.error(`Invite email delivery failed for ${email}`, error);
            emailSent = false;
            emailError = error instanceof Error ? error.message : 'Invite email send failed';
        }

        return { inviteLink, expiresAt, emailSent, emailError };
    }

    private mapAdminUser(user: AdminUserRecord) {
        const latestInvite = user.invites[0]
            ? {
                id: user.invites[0].id,
                createdAt: user.invites[0].createdAt,
                expiresAt: user.invites[0].expiresAt,
                usedAt: user.invites[0].usedAt,
            }
            : null;
        const hasAcceptedInvite = user.invites.some((invite) => !!invite.usedAt);
        const invitePending = !!latestInvite && !latestInvite.usedAt && latestInvite.expiresAt.getTime() > Date.now();
        const inviteExpired = !!latestInvite && !latestInvite.usedAt && latestInvite.expiresAt.getTime() <= Date.now();

        return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            avatar: user.avatar,
            isActive: user.isActive,
            orgId: user.orgId,
            customPermissions: user.customPermissions,
            twoFactorEnabled: user.twoFactorEnabled,
            dashboardPreferences: user.dashboardPreferences,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
            clientMemberships: user.clientMemberships,
            latestInvite,
            hasAcceptedInvite,
            invitePending,
            inviteExpired,
        };
    }

    async create(
        createUserDto: CreateUserDto,
        currentOrgId: string,
        currentUserId?: string,
    ): Promise<{ user: SafeUser; inviteLink?: string; expiresAt?: Date; inviteEmailSent?: boolean; inviteEmailError?: string }> {
        const { password, ...userData } = createUserDto;
        const crypto = require('crypto');

        // Logic: If password provided, use it. If not, generate invite.
        let hashedPassword = '';
        let inviteToken = '';
        let inviteExpiresAt: Date | undefined;

        if (password) {
            hashedPassword = await bcrypt.hash(password, 10);
        } else {
            // Generate Invite
            inviteToken = crypto.randomBytes(32).toString('hex');
            const dummyPassword = crypto.randomBytes(32).toString('hex');
            hashedPassword = await bcrypt.hash(dummyPassword, 10); // Unusable password
            inviteExpiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000); // 72 hours
        }

        // Hardcode OrgId for vertical slice if not provided/available
        const orgId = await this.resolveOrgId(currentOrgId);

        try {
            const { permissions, clientId, ...restUserData } = userData as CreateUserDto & { permissions?: string[] };
            const user = await this.prisma.user.create({
                data: {
                    ...restUserData,
                    customPermissions: permissions ?? [],
                    passwordHash: hashedPassword,
                    orgId: orgId,
                    ...(inviteToken ? {
                        invites: {
                            create: {
                                tokenHash: crypto.createHash('sha256').update(inviteToken).digest('hex'),
                                expiresAt: inviteExpiresAt!,
                                createdById: currentUserId
                            }
                        }
                    } : {}),
                    ...(createUserDto.clientId && (userData.role.startsWith('CLIENT_')) ? {
                        clientMemberships: {
                            create: {
                                clientId: createUserDto.clientId,
                                role: userData.role
                            }
                        }
                    } : {})
                },
                select: safeUserSelect
            });

            // Construct Invite Link
            let inviteLink: string | undefined;
            let inviteEmailSent: boolean | undefined;
            let inviteEmailError: string | undefined;
            if (inviteToken) {
                inviteLink = this.buildInviteLink(inviteToken);

                try {
                    await this.emailService.sendInvite(userData.email, inviteLink, 'Arena360');
                    inviteEmailSent = true;
                } catch (error) {
                    console.error(`Invite email delivery failed for ${userData.email}`, error);
                    inviteEmailSent = false;
                    inviteEmailError = error instanceof Error ? error.message : 'Invite email send failed';
                }
            }

            return { user, inviteLink, expiresAt: inviteExpiresAt, inviteEmailSent, inviteEmailError };
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
                throw new ConflictException('Email already exists');
            }
            throw error;
        }
    }

    async findAll(orgId: string): Promise<SafeUser[]> {
        const resolvedOrgId = await this.resolveOrgId(orgId);

        const users = await this.prisma.user.findMany({
            where: { orgId: resolvedOrgId },
            orderBy: { createdAt: 'desc' },
            select: adminUserSelect
        });

        return users.map((user) => this.mapAdminUser(user)) as SafeUser[];
    }

    // Find for internal use (by ID)
    async findOne(id: string): Promise<SafeUser | null> {
        return this.prisma.user.findUnique({
            where: { id },
            select: safeUserSelect
        });
    }

    async update(id: string, updateUserDto: UpdateUserDto): Promise<SafeUser> {
        const user = await this.prisma.user.findUnique({
            where: { id },
            include: { clientMemberships: true }
        });
        if (!user) {
            throw new NotFoundException('User not found');
        }

        const newRole = updateUserDto.role;
        const oldRole = user.role;
        const isChangingRole = newRole && newRole !== oldRole;
        const newIsClientRole = newRole?.startsWith('CLIENT_');
        const oldIsClientRole = oldRole?.startsWith('CLIENT_');

        // Build core user update data
        let dataToUpdate: any = { ...updateUserDto };
        if (updateUserDto.permissions !== undefined) {
            dataToUpdate.customPermissions = updateUserDto.permissions;
        }
        delete dataToUpdate.permissions;
        delete dataToUpdate.clientId; // handled separately below

        if (updateUserDto.password) {
            dataToUpdate.passwordHash = await bcrypt.hash(updateUserDto.password, 10);
            delete dataToUpdate.password;
        }

        // Run everything in a transaction so DB is always consistent
        return this.prisma.$transaction(async (tx) => {
            const effectiveRole = newRole || oldRole;
            const effectiveIsClientRole = !!effectiveRole?.startsWith('CLIENT_');
            const requestedClientId = updateUserDto.clientId;
            const hasRequestedMembership = !!requestedClientId && user.clientMemberships.some((membership) => membership.clientId === requestedClientId);

            if (isChangingRole) {
                if (newIsClientRole) {
                    // Switching TO a client role — must link to a client
                    const clientId = requestedClientId;

                    if (oldIsClientRole && user.clientMemberships.length > 0) {
                        await tx.clientMember.updateMany({
                            where: { userId: id },
                            data: { role: newRole }
                        });

                        if (clientId && !hasRequestedMembership) {
                            await tx.clientMember.create({
                                data: { userId: id, clientId, role: newRole }
                            });
                        }
                    } else {
                        // Was an internal user — remove any stale memberships and create fresh
                        await tx.clientMember.deleteMany({ where: { userId: id } });
                        if (clientId) {
                            await tx.clientMember.create({
                                data: { userId: id, clientId, role: newRole }
                            });
                        }
                        // Also remove from all project memberships (internal projects)
                        await tx.projectMember.deleteMany({ where: { userId: id } });
                    }

                } else {
                    // Switching FROM a client role TO an internal role
                    // Remove all client & project memberships — they get reassigned by PM
                    await tx.clientMember.deleteMany({ where: { userId: id } });
                    await tx.projectMember.deleteMany({ where: { userId: id } });
                }
            }

            if (!isChangingRole && effectiveIsClientRole && requestedClientId) {
                if (hasRequestedMembership) {
                    await tx.clientMember.updateMany({
                        where: { userId: id, clientId: requestedClientId },
                        data: { role: effectiveRole as GlobalRole }
                    });
                } else {
                    await tx.clientMember.create({
                        data: { userId: id, clientId: requestedClientId, role: effectiveRole as GlobalRole }
                    });
                }
            }

            // Update the user record itself
            return tx.user.update({
                where: { id },
                data: dataToUpdate,
                select: safeUserSelect
            });
        });
    }


    async updatePermissions(id: string, permissions: string[]): Promise<SafeUser> {
        await this.prisma.user.findUniqueOrThrow({ where: { id } });
        return this.prisma.user.update({
            where: { id },
            data: { customPermissions: permissions },
            select: safeUserSelect
        });
    }

    async resendInvite(
        id: string,
        currentOrgId: string,
        currentUserId?: string,
    ): Promise<{ inviteLink: string; expiresAt: Date; emailSent: boolean; emailError?: string }> {
        const resolvedOrgId = await this.resolveOrgId(currentOrgId);
        const user = await this.prisma.user.findFirst({
            where: {
                id,
                orgId: resolvedOrgId,
            },
            select: {
                id: true,
                email: true,
                invites: {
                    orderBy: { createdAt: 'desc' },
                    select: {
                        id: true,
                        usedAt: true,
                    }
                }
            }
        });

        if (!user) {
            throw new NotFoundException('User not found');
        }

        if (user.id === currentUserId) {
            throw new BadRequestException('You cannot resend an invite to your own account');
        }

        if (user.invites.length === 0) {
            throw new BadRequestException('This user was not created through the invite flow');
        }

        if (user.invites.some((invite) => !!invite.usedAt)) {
            throw new BadRequestException('This user has already completed account setup');
        }

        return this.issueInvite(user.id, user.email, currentUserId);
    }

    async remove(id: string, currentOrgId: string, currentUserId?: string): Promise<{ success: true }> {
        const user = await this.prisma.user.findFirst({
            where: { id, orgId: currentOrgId },
            select: {
                id: true,
                role: true,
                name: true,
            }
        });

        if (!user) {
            throw new NotFoundException('User not found');
        }

        if (user.id === currentUserId) {
            throw new BadRequestException('You cannot delete your own account');
        }

        if (user.role === GlobalRole.SUPER_ADMIN) {
            throw new BadRequestException('Super Admin accounts cannot be deleted');
        }

        const [
            projectUpdates,
            uploadedFiles,
            reportedFindings,
            createdReports,
            createdInvoices,
            createdContracts,
            findingComments,
            discussions,
            discussionReplies,
            timeEntries,
            approvalRequestsRequested,
            projectReportsPerformed,
            projectReportEntriesCreated,
        ] = await Promise.all([
            this.prisma.projectUpdate.count({ where: { authorId: id } }),
            this.prisma.fileAsset.count({ where: { uploaderId: id } }),
            this.prisma.finding.count({ where: { reportedById: id } }),
            this.prisma.report.count({ where: { createdById: id } }),
            this.prisma.invoice.count({ where: { createdById: id } }),
            this.prisma.contract.count({ where: { createdById: id } }),
            this.prisma.findingComment.count({ where: { authorId: id } }),
            this.prisma.discussion.count({ where: { authorId: id } }),
            this.prisma.discussionReply.count({ where: { authorId: id } }),
            this.prisma.timeEntry.count({ where: { userId: id } }),
            this.prisma.approvalRequest.count({ where: { requestedById: id } }),
            this.prisma.projectReport.count({ where: { performedById: id } }),
            this.prisma.projectReportEntry.count({ where: { createdById: id } }),
        ]);

        const blockingRefs = [
            projectUpdates,
            uploadedFiles,
            reportedFindings,
            createdReports,
            createdInvoices,
            createdContracts,
            findingComments,
            discussions,
            discussionReplies,
            timeEntries,
            approvalRequestsRequested,
            projectReportsPerformed,
            projectReportEntriesCreated,
        ].reduce((sum, count) => sum + count, 0);

        if (blockingRefs > 0) {
            throw new BadRequestException('This user has activity history and cannot be deleted. Deactivate the account instead.');
        }

        await this.prisma.user.delete({
            where: { id }
        });

        return { success: true };
    }

    async getDashboardPreferences(userId: string): Promise<{ widgets: { id: string; order: number; config?: Record<string, unknown> }[] }> {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { dashboardPreferences: true },
        });
        const prefs = user?.dashboardPreferences as { widgets?: { id: string; order: number; config?: Record<string, unknown> }[] } | null;
        return { widgets: prefs?.widgets ?? [] };
    }

    async updateDashboardPreferences(userId: string, data: { widgets: { id: string; order: number; config?: Record<string, unknown> }[] }): Promise<{ widgets: { id: string; order: number; config?: Record<string, unknown> }[] }> {
        await this.prisma.user.update({
            where: { id: userId },
            data: { dashboardPreferences: data as any },
        });
        return this.getDashboardPreferences(userId);
    }

}


