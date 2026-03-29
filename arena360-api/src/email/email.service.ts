import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

@Injectable()
export class EmailService {
    private resend: Resend | null = null;
    private readonly logger = new Logger(EmailService.name);
    private readonly fromEmail: string;

    constructor(private configService: ConfigService) {
        const apiKey = this.configService.get<string>('RESEND_API_KEY');
        this.fromEmail =
            this.configService.get<string>('EMAIL_FROM') ||
            this.configService.get<string>('RESEND_FROM_EMAIL') ||
            'onboarding@resend.dev';

        if (apiKey && apiKey.startsWith('re_')) {
            this.resend = new Resend(apiKey);
            this.logger.log('EmailService initialized with Resend');
        } else {
            this.logger.warn('RESEND_API_KEY missing or invalid. EmailService running in DEV mode (Console Log only).');
        }
    }

    async sendInvite(to: string, inviteLink: string, orgName: string = 'Arena360'): Promise<void> {
        const subject = `You've been invited to join ${orgName}`;
        const html = `
            <div style="font-family: sans-serif; padding: 20px; color: #333;">
                <h1>Welcome to ${orgName}</h1>
                <p>You have been invited to join the <strong>${orgName}</strong> workspace on Arena360.</p>
                <p>Click the button below to accept your invitation and set up your account:</p>
                <a href="${inviteLink}" style="display: inline-block; background-color: #0070f3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 20px 0;">Accept Invitation</a>
                <p>or copy this link: <br> <a href="${inviteLink}">${inviteLink}</a></p>
                <p>This link will expire in 72 hours.</p>
            </div>
        `;

        if (this.resend) {
            try {
                const response = await this.resend.emails.send({
                    from: this.fromEmail,
                    to,
                    subject,
                    html,
                });
                if (response.error) {
                    this.logger.error(`Failed to send invite email to ${to}: ${response.error.message}`);
                    throw new Error(response.error.message || 'Invite email send failed');
                }
                this.logger.log(`Invite email sent to ${to}`);
            } catch (error) {
                this.logger.error(`Failed to send invite email to ${to}:`, error);
                throw error; // Or swallow if we don't want to block user creation
            }
        } else {
            // DEV Mode
            this.logger.log('================ [DEV] EMAIL PREVIEW ================');
            this.logger.log(`TO: ${to}`);
            this.logger.log(`SUBJECT: ${subject}`);
            this.logger.log(`LINK: ${inviteLink}`);
            this.logger.log('=====================================================');
        }
    }

    async sendPasswordReset(to: string, resetLink: string, orgName: string = 'Arena360'): Promise<void> {
        const subject = `Reset your ${orgName} password`;
        const html = `
            <div style="font-family: sans-serif; padding: 20px; color: #333;">
                <h1>Reset your password</h1>
                <p>You requested a password reset for your <strong>${orgName}</strong> account on Arena360.</p>
                <p>Click the button below to choose a new password:</p>
                <a href="${resetLink}" style="display: inline-block; background-color: #06b6d4; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 20px 0;">Reset password</a>
                <p>or copy this link: <br> <a href="${resetLink}">${resetLink}</a></p>
                <p>This link will expire in 1 hour. If you didn't request this, you can ignore this email.</p>
            </div>
        `;
        if (this.resend) {
            try {
                const response = await this.resend.emails.send({
                    from: this.fromEmail,
                    to,
                    subject,
                    html,
                });
                if (response.error) {
                    this.logger.error(`Failed to send password reset email to ${to}: ${response.error.message}`);
                    throw new Error(response.error.message || 'Password reset email send failed');
                }
                this.logger.log(`Password reset email sent to ${to}`);
            } catch (error) {
                this.logger.error(`Failed to send password reset email to ${to}:`, error);
                throw error;
            }
        } else {
            this.logger.log('================ [DEV] PASSWORD RESET EMAIL ================');
            this.logger.log(`TO: ${to}`);
            this.logger.log(`SUBJECT: ${subject}`);
            this.logger.log(`LINK: ${resetLink}`);
            this.logger.log('================================================================');
        }
    }
}
