import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PrismaService } from '../common/prisma.service';
import * as bcrypt from 'bcrypt';
import { User, GlobalRole, Prisma } from '@prisma/client';

type SafeUser = Omit<User, 'passwordHash' | 'twoFactorSecret' | 'recoveryCodes'>;

import { EmailService } from '../email/email.service';

@Injectable()
export class UsersService {
    constructor(
        private prisma: PrismaService,
        private emailService: EmailService
    ) { }

    async create(createUserDto: CreateUserDto, currentOrgId: string, currentUserId?: string): Promise<{ user: SafeUser, inviteLink?: string, expiresAt?: Date }> {
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
        let orgId = currentOrgId;
        if (!orgId) {
            const defaultOrg = await this.prisma.org.findFirst();
            if (defaultOrg) orgId = defaultOrg.id;
        }

        try {
            const { permissions, ...restUserData } = userData as CreateUserDto & { permissions?: string[] };
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
                    } : {})
                },
                select: {
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
                }
            });

            // Construct Invite Link
            let inviteLink: string | undefined;
            if (inviteToken) {
                // Assuming Vite Frontend runs on localhost:5173 or inferred from env
                // We'll use a standard format, can be configured via env later
                const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
                inviteLink = `${frontendUrl}/#/accept-invite?token=${inviteToken}`;

                // Send Invite Email
                await this.emailService.sendInvite(userData.email, inviteLink, 'Arena360');
            }

            return { user, inviteLink, expiresAt: inviteExpiresAt };
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
                throw new ConflictException('Email already exists');
            }
            throw error;
        }
    }

    async findAll(orgId: string): Promise<SafeUser[]> {
        // Retrieve default org if none provided
        if (!orgId) {
            const defaultOrg = await this.prisma.org.findFirst();
            if (defaultOrg) orgId = defaultOrg.id;
        }

        return this.prisma.user.findMany({
            where: { orgId: orgId },
            orderBy: { createdAt: 'desc' },
            select: {
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
            }
        });
    }

    // Find for internal use (by ID)
    async findOne(id: string): Promise<SafeUser | null> {
        return this.prisma.user.findUnique({
            where: { id },
            select: {
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
            }
        });
    }

    async update(id: string, updateUserDto: UpdateUserDto): Promise<SafeUser> {
        const user = await this.prisma.user.findUnique({ where: { id } });
        if (!user) {
            throw new NotFoundException('User not found');
        }

        let dataToUpdate: any = { ...updateUserDto };
        if (updateUserDto.permissions !== undefined) {
            dataToUpdate.customPermissions = updateUserDto.permissions;
            delete dataToUpdate.permissions;
        }
        if (updateUserDto.password) {
            dataToUpdate.passwordHash = await bcrypt.hash(updateUserDto.password, 10);
            delete dataToUpdate.password;
        }

        return this.prisma.user.update({
            where: { id },
            data: dataToUpdate,
            select: {
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
            }
        });
    }

    async updatePermissions(id: string, permissions: string[]): Promise<SafeUser> {
        await this.prisma.user.findUniqueOrThrow({ where: { id } });
        return this.prisma.user.update({
            where: { id },
            data: { customPermissions: permissions },
            select: {
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
            }
        });
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
