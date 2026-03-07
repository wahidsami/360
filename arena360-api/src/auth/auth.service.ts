import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as speakeasy from 'speakeasy';
import { PrismaService } from '../common/prisma.service';
import { EmailService } from '../email/email.service';

@Injectable()
export class AuthService {
    constructor(
        private prisma: PrismaService,
        private jwtService: JwtService,
        private config: ConfigService,
        private email: EmailService,
    ) { }

    async validateUser(email: string, pass: string): Promise<any> {
        const user = await this.prisma.user.findUnique({ where: { email } });
        if (!user || !user.passwordHash) return null;
        if (await bcrypt.compare(pass, user.passwordHash)) {
            const { passwordHash, twoFactorSecret, recoveryCodes, ...result } = user;
            return result;
        }
        return null;
    }

    async login(user: any) {
        const fullUser = await this.prisma.user.findUnique({
            where: { id: user.id },
            select: { id: true, email: true, name: true, role: true, avatar: true, isActive: true, orgId: true, customPermissions: true, twoFactorEnabled: true },
        });
        if (fullUser?.twoFactorEnabled) {
            const challenge = this.jwtService.sign(
                { userId: user.id, purpose: '2fa' },
                { expiresIn: '5m' },
            );
            return { requires2fa: true, challenge };
        }
        const payload = { email: user.email, sub: user.id, role: user.role, orgId: user.orgId };
        return {
            accessToken: this.jwtService.sign(payload),
            user,
        };
    }

    async verify2faLogin(challenge: string, code: string) {
        let decoded: { userId?: string; purpose?: string };
        try {
            decoded = this.jwtService.verify(challenge);
        } catch {
            throw new UnauthorizedException('Challenge expired or invalid');
        }
        if (decoded.purpose !== '2fa' || !decoded.userId) {
            throw new UnauthorizedException('Invalid challenge');
        }
        const user = await this.prisma.user.findUnique({
            where: { id: decoded.userId },
            select: { id: true, email: true, name: true, role: true, avatar: true, isActive: true, orgId: true, customPermissions: true, twoFactorSecret: true, recoveryCodes: true },
        });
        if (!user || !user.twoFactorSecret) throw new UnauthorizedException('Invalid');
        const valid = speakeasy.totp.verify({
            secret: user.twoFactorSecret,
            encoding: 'base32',
            token: code,
            window: 1,
        });
        if (!valid && user.recoveryCodes) {
            const codes = (user.recoveryCodes as string).split(',');
            const idx = codes.indexOf(code.trim());
            if (idx !== -1) {
                codes.splice(idx, 1);
                await this.prisma.user.update({
                    where: { id: user.id },
                    data: { recoveryCodes: codes.join(',') },
                });
            } else {
                throw new UnauthorizedException('Invalid code');
            }
        } else if (!valid) {
            throw new UnauthorizedException('Invalid code');
        }
        const { twoFactorSecret, recoveryCodes, ...safeUser } = user;
        const payload = { email: safeUser.email, sub: safeUser.id, role: safeUser.role, orgId: safeUser.orgId };
        return {
            accessToken: this.jwtService.sign(payload),
            user: safeUser,
        };
    }

    async setup2fa(userId: string) {
        const secret = speakeasy.generateSecret({ name: `Arena360`, length: 20 });
        await this.prisma.user.update({
            where: { id: userId },
            data: { twoFactorSecret: secret.base32, twoFactorEnabled: false, recoveryCodes: null },
        });
        return { secret: secret.base32, otpauthUrl: secret.otpauth_url };
    }

    async verify2faSetup(userId: string, code: string) {
        const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { twoFactorSecret: true } });
        if (!user?.twoFactorSecret) throw new UnauthorizedException('2FA not started');
        const valid = speakeasy.totp.verify({ secret: user.twoFactorSecret, encoding: 'base32', token: code, window: 1 });
        if (!valid) throw new UnauthorizedException('Invalid code');
        const recoveryCodes = Array.from({ length: 10 }, () => Math.random().toString(36).slice(2, 10)).join(',');
        await this.prisma.user.update({
            where: { id: userId },
            data: { twoFactorEnabled: true, recoveryCodes },
        });
        return { recoveryCodes: recoveryCodes.split(',') };
    }

    async disable2fa(userId: string, password: string) {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user?.passwordHash) throw new UnauthorizedException('Cannot disable 2FA');
        if (!(await bcrypt.compare(password, user.passwordHash))) throw new UnauthorizedException('Invalid password');
        await this.prisma.user.update({
            where: { id: userId },
            data: { twoFactorSecret: null, twoFactorEnabled: false, recoveryCodes: null },
        });
        return { ok: true };
    }

    async acceptInvite(token: string, password: string): Promise<any> {
        const crypto = require('crypto');
        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

        const invite = await this.prisma.userInvite.findUnique({
            where: { tokenHash },
        });

        if (!invite) {
            throw new UnauthorizedException('Invalid invite link');
        }

        if (invite.usedAt) {
            throw new UnauthorizedException('Invite link already used');
        }

        if (new Date() > invite.expiresAt) {
            throw new UnauthorizedException('Invite link expired');
        }

        const passwordHash = await bcrypt.hash(password, 10);

        // Transaction: Update user password and mark invite as used
        const [updatedUser] = await this.prisma.$transaction([
            this.prisma.user.update({
                where: { id: invite.userId },
                data: { passwordHash },
                select: {
                    id: true,
                    email: true,
                    name: true,
                    role: true,
                    avatar: true,
                    isActive: true,
                    orgId: true,
                    createdAt: true,
                    updatedAt: true,
                }
            }),
            this.prisma.userInvite.update({
                where: { id: invite.id },
                data: { usedAt: new Date() }
            })
        ]);

        return updatedUser;
    }

  async signupOrg(orgName: string, orgSlug: string, adminEmail: string, adminName: string, password: string) {
    const existingUser = await this.prisma.user.findUnique({ where: { email: adminEmail.trim().toLowerCase() } });
    if (existingUser) throw new UnauthorizedException('An account with this email already exists');
    const slug = orgSlug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || 'org';
    const existingOrg = await this.prisma.org.findUnique({ where: { slug } });
    if (existingOrg) throw new UnauthorizedException('Organization slug already in use');
    const passwordHash = await bcrypt.hash(password, 10);
    const org = await this.prisma.org.create({
      data: {
        name: orgName.trim(),
        slug,
        plan: 'FREE',
        maxUsers: 50,
        maxProjects: 100,
        maxStorageMB: 5000,
      },
    });
    const { GlobalRole } = await import('@prisma/client');
    const user = await this.prisma.user.create({
      data: {
        orgId: org.id,
        email: adminEmail.trim().toLowerCase(),
        name: adminName.trim() || adminEmail.split('@')[0],
        passwordHash,
        role: GlobalRole.SUPER_ADMIN,
        isActive: true,
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
      },
    });
    return this.login(user);
  }

    /** Forgot password: create reset token and send email. Always returns success to avoid leaking account existence. */
    async forgotPassword(email: string): Promise<{ message: string }> {
        const crypto = require('crypto');
        const user = await this.prisma.user.findUnique({
            where: { email: email.trim() },
            include: { org: { select: { name: true } } },
        });
        if (!user || !user.passwordHash) {
            return { message: 'If an account exists with this email, you will receive a password reset link.' };
        }
        const token = crypto.randomBytes(32).toString('hex');
        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
        await this.prisma.passwordResetToken.create({
            data: { userId: user.id, tokenHash, expiresAt },
        });
        const frontendUrl = this.config.get<string>('FRONTEND_URL') || 'http://localhost:5173';
        const resetLink = `${frontendUrl}/#/reset-password?token=${encodeURIComponent(token)}`;
        const orgName = user.org?.name || 'Arena360';
        await this.email.sendPasswordReset(user.email, resetLink, orgName).catch((err) => {
            console.error('Failed to send password reset email:', err);
        });
        return { message: 'If an account exists with this email, you will receive a password reset link.' };
    }

    /** Reset password using token from email link. */
    async resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
        const crypto = require('crypto');
        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
        const record = await this.prisma.passwordResetToken.findUnique({
            where: { tokenHash },
            include: { user: true },
        });
        if (!record) throw new UnauthorizedException('Invalid or expired reset link');
        if (record.usedAt) throw new UnauthorizedException('This reset link has already been used');
        if (new Date() > record.expiresAt) throw new UnauthorizedException('This reset link has expired');
        const passwordHash = await bcrypt.hash(newPassword, 10);
        await this.prisma.$transaction([
            this.prisma.user.update({
                where: { id: record.userId },
                data: { passwordHash },
            }),
            this.prisma.passwordResetToken.update({
                where: { id: record.id },
                data: { usedAt: new Date() },
            }),
        ]);
        return { message: 'Password has been reset. You can now log in.' };
    }
}
