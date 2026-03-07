import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { GlobalRole } from '@prisma/client';

@Controller('admin/audit-logs')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(GlobalRole.SUPER_ADMIN, GlobalRole.OPS)
export class AuditLogsController {
    constructor(private readonly prisma: PrismaService) { }

    @Get()
    async getAuditLogs(
        @Query('page') page: string = '1',
        @Query('limit') limit: string = '20',
        @Query('entity') entity?: string,
        @Query('actorId') actorId?: string,
        @Query('action') action?: string,
    ) {
        const p = parseInt(page);
        const l = parseInt(limit);
        const skip = (p - 1) * l;

        const where = {
            ...(entity && { entity }),
            ...(actorId && { actorId }),
            ...(action && { action }),
        };

        const [items, total] = await Promise.all([
            this.prisma.auditLog.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip,
                take: l,
            }),
            this.prisma.auditLog.count({ where }),
        ]);

        return {
            items,
            meta: {
                total,
                page: p,
                lastPage: Math.ceil(total / l),
            },
        };
    }
}
