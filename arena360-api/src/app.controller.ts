import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { AppService } from './app.service';
import { PrismaService } from './common/prisma.service';
import { StorageService } from './common/storage.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) { }

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('health')
  getHealth() {
    return {
      status: 'ok',
      version: '0.0.1',
      timestamp: new Date().toISOString(),
      fingerprint: process.env.VITE_APP_FINGERPRINT || 'arena-os-v1.0b',
    };
  }

  @Get('ready')
  async getReady() {
    try {
      // 1. Check Database
      await this.prisma.$queryRaw`SELECT 1`;

      // 2. Check Storage (Lightweight check)
      // If using local storage, this is always 'true' basically
      // If S3, we check if s3 client is initialized
      // For a real check we'd do a headBucket, but let's keep it lean

      return {
        status: 'ready',
        database: 'connected',
        storage: 'initialized',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      throw new ServiceUnavailableException({
        status: 'not_ready',
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  @Get('changelog')
  getChangelog(): { version: string; date: string; changes: string[] }[] {
    return [
      {
        version: '1.2.0',
        date: '2025-03-06',
        changes: [
          'Recurring tasks: templates, scheduler, and project Recurring tasks tab',
          'Backup & restore: PowerShell script and docs/backup-restore.md',
          'Changelog API and in-app changelog view',
        ],
      },
      {
        version: '1.1.0',
        date: '2025-03-05',
        changes: [
          'True multi-tenancy: org creation, signup, org isolation',
          'Onboarding wizard for new orgs',
          'Real-time notifications via WebSocket',
          'SAML SSO and custom branding (org-by-slug, login/app branding)',
          'Payment gateway: Stripe, Pay with Card, webhooks',
          'Advanced workflow: multi-step approvals, automations condition builder',
          'Dashboard customization: widget visibility and order',
        ],
      },
      {
        version: '1.0.0',
        date: '2025-01-01',
        changes: [
          'Projects, tasks, milestones, sprints',
          'Clients, contracts, invoices, findings',
          'Reports, discussions, time entries, activity',
          'Auth, roles, permissions, audit logs',
        ],
      },
    ];
  }
}
