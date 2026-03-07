import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { UserWithRoles } from '../common/utils/scope.utils';

@Injectable()
export class DashboardService {
    constructor(private prisma: PrismaService) { }

    async getAdminStats(user: UserWithRoles) {
        // Admin dashboard: internal role only
        const internalRoles = ['SUPER_ADMIN', 'OPS', 'PM', 'DEV'];
        if (!internalRoles.includes(user.role)) {
            throw new Error('Admin dashboard is for internal staff only');
        }

        // Aggregate stats within user's org
        const [totalClients, projects, tasks, pendingMilestones, paidInvoices, recentUpdates] = await Promise.all([
            this.prisma.client.count({
                where: { orgId: user.orgId, status: { not: 'ARCHIVED' } }
            }),
            this.prisma.project.findMany({
                where: { orgId: user.orgId },
                include: { client: { select: { name: true } } }
            }),
            this.prisma.task.findMany({
                where: {
                    project: { orgId: user.orgId }
                },
                include: { project: { select: { name: true } } }
            }),
            this.prisma.milestone.count({
                where: {
                    project: { orgId: user.orgId },
                    status: 'PENDING'
                }
            }),
            this.prisma.invoice.aggregate({
                where: {
                    orgId: user.orgId,
                    status: 'PAID'
                },
                _sum: { amount: true }
            }),
            this.prisma.projectUpdate.findMany({
                where: { orgId: user.orgId },
                orderBy: { createdAt: 'desc' },
                take: 5,
                include: { author: { select: { name: true } } }
            })
        ]);

        const activeProjects = projects.filter(p =>
            p.status === 'IN_PROGRESS' || p.status === 'PLANNING'
        ).length;

        const projectsAtRisk = projects
            .filter(p => p.health === 'AT_RISK' || p.health === 'CRITICAL')
            .map(p => ({
                id: p.id,
                name: p.name,
                health: p.health,
                progress: p.progress,
                clientName: p.client?.name || 'Unknown'
            }));

        const now = new Date();
        const overdueTasks = tasks.filter(t =>
            t.status !== 'DONE' && t.dueDate && new Date(t.dueDate) < now
        ).length;

        const latestUpdates = recentUpdates.map(u => ({
            id: u.id,
            title: u.title,
            content: u.content,
            timestamp: u.createdAt,
            authorName: u.author.name
        }));

        return {
            totalClients,
            activeProjects,
            projectsAtRisk: projectsAtRisk.slice(0, 5), // Top 5
            overdueTasks,
            latestUpdates,
            recentUpdatesCount: latestUpdates.length,
            pendingMilestones,
            revenue: paidInvoices._sum.amount || 0
        };
    }

    async getDevStats(user: UserWithRoles) {
        // Dev dashboard: tasks assigned to this developer
        const tasks = await this.prisma.task.findMany({
            where: {
                assigneeId: user.id,
                status: { not: 'DONE' }
            },
            include: { project: { select: { name: true } } },
            orderBy: { dueDate: 'asc' }
        });

        const now = new Date();
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const nextWeek = new Date(now);
        nextWeek.setDate(nextWeek.getDate() + 7);

        const myOpenTasks = tasks.length;
        const dueSoon = tasks.filter(t =>
            t.dueDate && new Date(t.dueDate) >= now && new Date(t.dueDate) <= nextWeek
        ).length;
        const inReview = tasks.filter(t => t.status === 'REVIEW').length;
        const overdue = tasks.filter(t =>
            t.dueDate && new Date(t.dueDate) < now
        ).length;

        const assignedTasks = tasks.slice(0, 10).map(t => ({
            id: t.id,
            title: t.title,
            status: t.status,
            priority: t.priority,
            dueDate: t.dueDate,
            projectId: t.projectId,
            projectName: t.project?.name || 'Unknown'
        }));

        return {
            myOpenTasks,
            dueSoon,
            inReview,
            overdue,
            assignedTasks
        };
    }

    async getFinanceStats(user: UserWithRoles) {
        // Finance dashboard: internal finance role
        const financeRoles = ['SUPER_ADMIN', 'OPS', 'FINANCE'];
        if (!financeRoles.includes(user.role)) {
            throw new Error('Finance dashboard is for finance staff only');
        }

        const [
            outstandingStats,
            invoicesDueCount,
            paidStats,
            contractsActive,
            overdueInvoices,
            recentInvoices
        ] = await Promise.all([
            // 1. Outstanding Amount (ISSUED or OVERDUE)
            this.prisma.invoice.aggregate({
                where: {
                    orgId: user.orgId,
                    status: { in: ['ISSUED', 'OVERDUE'] }
                },
                _sum: { amount: true }
            }),
            // 2. Invoices Due Count
            this.prisma.invoice.count({
                where: {
                    orgId: user.orgId,
                    status: { in: ['ISSUED', 'OVERDUE'] }
                }
            }),
            // 3. Paid This Month
            this.prisma.invoice.aggregate({
                where: {
                    orgId: user.orgId,
                    status: 'PAID',
                    updatedAt: {
                        gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
                    }
                },
                _sum: { amount: true }
            }),
            // 4. Active Contracts
            this.prisma.contract.count({
                where: {
                    orgId: user.orgId,
                    status: 'ACTIVE'
                }
            }),
            // 5. Overdue Invoices List
            this.prisma.invoice.findMany({
                where: {
                    orgId: user.orgId,
                    status: { not: 'PAID' },
                    dueDate: { lt: new Date() }
                },
                take: 5,
                orderBy: { dueDate: 'asc' },
                include: { project: { select: { client: { select: { name: true } } } } }
            }),
            // 6. Recent Invoices List
            this.prisma.invoice.findMany({
                where: { orgId: user.orgId },
                take: 5,
                orderBy: { createdAt: 'desc' },
                include: { project: { select: { client: { select: { name: true } } } } }
            })
        ]);

        return {
            outstandingAmount: outstandingStats._sum.amount || 0,
            invoicesDueCount,
            paidThisMonth: paidStats._sum.amount || 0,
            contractsActive,
            overdueInvoices: overdueInvoices.map(inv => ({
                id: inv.id,
                amount: inv.amount,
                dueDate: inv.dueDate,
                clientName: inv.project?.client?.name || 'Unknown',
                status: inv.status
            })),
            recentInvoices: recentInvoices.map(inv => ({
                id: inv.id,
                amount: inv.amount,
                status: inv.status,
                issueDate: inv.createdAt,
                clientName: inv.project?.client?.name || 'Unknown'
            }))
        };
    }

    async getClientStats(user: UserWithRoles) {
        // Client dashboard: show projects for client user's organization
        const clientRoles = ['CLIENT_OWNER', 'CLIENT_MANAGER', 'CLIENT_MEMBER'];
        if (!clientRoles.includes(user.role)) {
            throw new Error('Client dashboard is for client users only');
        }

        // Find client record for this user's org
        const client = await this.prisma.client.findFirst({
            where: { orgId: user.orgId }
        });

        if (!client) {
            return {
                activeProjects: 0,
                nextMilestonesCount: 0,
                latestUpdatesCount: 0,
                myProjects: []
            };
        }

        // Get projects for this client
        const projects = await this.prisma.project.findMany({
            where: { clientId: client.id },
            orderBy: { updatedAt: 'desc' }
        });

        const activeProjects = projects.filter(p =>
            p.status !== 'ARCHIVED' && p.status !== 'COMPLETED'
        ).length;

        const myProjects = projects.map(p => ({
            id: p.id,
            name: p.name,
            progress: p.progress,
            health: p.health,
            status: p.status
        }));

        return {
            activeProjects,
            nextMilestonesCount: 0, // Placeholder
            latestUpdatesCount: 0, // Placeholder
            myProjects
        };
    }

    /** Advanced analytics for Analytics page (internal roles) */
    async getAnalytics(user: UserWithRoles) {
        const internalRoles = ['SUPER_ADMIN', 'OPS', 'PM', 'DEV', 'FINANCE'];
        if (!internalRoles.includes(user.role)) {
            throw new Error('Analytics is for internal staff only');
        }
        const orgId = user.orgId;

        const [
            projectsByHealth,
            projectsByStatus,
            projectsWithBudget,
            tasksByAssignee,
            tasksDoneLast30Days,
            invoicesPaidByMonth,
            invoicesOutstandingByAge,
            findingsBySeverity,
            findingsByStatus,
            findingsClosedWithTime,
            allTasksCount,
            doneTasksCount,
            tasksDoneByWeekRaw,
        ] = await Promise.all([
            this.prisma.project.groupBy({
                by: ['health'],
                where: { orgId, deletedAt: null },
                _count: { id: true },
            }),
            this.prisma.project.groupBy({
                by: ['status'],
                where: { orgId, deletedAt: null },
                _count: { id: true },
            }),
            this.prisma.project.aggregate({
                where: { orgId, deletedAt: null },
                _sum: { budget: true },
                _count: { id: true },
            }),
            this.prisma.task.groupBy({
                by: ['assigneeId'],
                where: { project: { orgId }, deletedAt: null, status: { not: 'DONE' } },
                _count: { id: true },
            }),
            this.prisma.task.count({
                where: {
                    project: { orgId },
                    status: 'DONE',
                    updatedAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
                },
            }),
            this.prisma.invoice.findMany({
                where: { orgId, status: 'PAID' },
                select: { paidAt: true, amount: true },
            }),
            this.prisma.invoice.findMany({
                where: { orgId, status: { in: ['ISSUED', 'OVERDUE'] } },
                select: { amount: true, dueDate: true },
            }),
            this.prisma.finding.groupBy({
                by: ['severity'],
                where: { orgId, deletedAt: null },
                _count: { id: true },
            }),
            this.prisma.finding.groupBy({
                by: ['status'],
                where: { orgId, deletedAt: null },
                _count: { id: true },
            }),
            this.prisma.finding.findMany({
                where: { orgId, status: 'CLOSED', deletedAt: null },
                select: { createdAt: true, updatedAt: true },
            }),
            this.prisma.task.count({
                where: { project: { orgId }, deletedAt: null },
            }),
            this.prisma.task.count({
                where: { project: { orgId }, status: 'DONE', deletedAt: null },
            }),
            this.prisma.task.findMany({
                where: {
                    project: { orgId },
                    status: 'DONE',
                    deletedAt: null,
                    updatedAt: { gte: new Date(Date.now() - 8 * 7 * 24 * 60 * 60 * 1000) },
                },
                select: { updatedAt: true },
            }),
        ]);

        // Paid by month (last 12 months)
        const paidByMonth: Record<string, number> = {};
        for (let i = 11; i >= 0; i--) {
            const d = new Date();
            d.setMonth(d.getMonth() - i);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            paidByMonth[key] = 0;
        }
        for (const inv of invoicesPaidByMonth) {
            if (!inv.paidAt) continue;
            const key = `${inv.paidAt.getFullYear()}-${String(inv.paidAt.getMonth() + 1).padStart(2, '0')}`;
            if (key in paidByMonth) paidByMonth[key] += inv.amount;
        }

        // AR aging: 0-30, 31-60, 61-90, 90+
        const now = new Date();
        const arAging = { '0-30': 0, '31-60': 0, '61-90': 0, '90+': 0 };
        for (const inv of invoicesOutstandingByAge) {
            const days = Math.floor((now.getTime() - new Date(inv.dueDate).getTime()) / (24 * 60 * 60 * 1000));
            if (days <= 30) arAging['0-30'] += inv.amount;
            else if (days <= 60) arAging['31-60'] += inv.amount;
            else if (days <= 90) arAging['61-90'] += inv.amount;
            else arAging['90+'] += inv.amount;
        }

        // MTTR: mean time to close (days)
        let mttrDays: number | null = null;
        if (findingsClosedWithTime.length > 0) {
            const totalDays = findingsClosedWithTime.reduce(
                (sum, f) => sum + (new Date(f.updatedAt).getTime() - new Date(f.createdAt).getTime()) / (24 * 60 * 60 * 1000),
                0,
            );
            mttrDays = Math.round((totalDays / findingsClosedWithTime.length) * 10) / 10;
        }

        // Resolve assignee names
        const assigneeIds = [...new Set(tasksByAssignee.map((t) => t.assigneeId).filter(Boolean))] as string[];
        const users = assigneeIds.length
            ? await this.prisma.user.findMany({
                  where: { id: { in: assigneeIds } },
                  select: { id: true, name: true },
              })
            : [];
        const userMap = new Map(users.map((u) => [u.id, u.name]));

        // Velocity: tasks completed per week (last 8 weeks, week starts Monday)
        const velocityByWeek: { weekLabel: string; completed: number }[] = [];
        for (let i = 7; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i * 7);
            const day = d.getDay();
            const diff = day === 0 ? -6 : 1 - day;
            d.setDate(d.getDate() + diff);
            d.setHours(0, 0, 0, 0);
            const weekEnd = new Date(d);
            weekEnd.setDate(weekEnd.getDate() + 7);
            const weekLabel = d.toISOString().slice(0, 10);
            const completed = (tasksDoneByWeekRaw || []).filter(
                (t) => new Date(t.updatedAt) >= d && new Date(t.updatedAt) < weekEnd,
            ).length;
            velocityByWeek.push({ weekLabel, completed });
        }

        const completionRate =
            allTasksCount > 0 ? Math.round((doneTasksCount / allTasksCount) * 1000) / 10 : 0;

        return {
            portfolio: {
                byHealth: projectsByHealth.map((g) => ({ health: g.health, count: g._count.id })),
                byStatus: projectsByStatus.map((g) => ({ status: g.status, count: g._count.id })),
                totalBudget: projectsWithBudget._sum.budget || 0,
                projectCount: projectsWithBudget._count.id,
            },
            team: {
                byAssignee: tasksByAssignee.map((g) => ({
                    assigneeId: g.assigneeId,
                    assigneeName: g.assigneeId ? userMap.get(g.assigneeId) || 'Unassigned' : 'Unassigned',
                    openTasks: g._count.id,
                })),
                tasksDoneLast30Days,
                velocityByWeek,
                completionRate,
                totalTasks: allTasksCount,
                doneTasks: doneTasksCount,
            },
            financial: {
                revenueByMonth: Object.entries(paidByMonth).map(([month, amount]) => ({ month, amount })),
                arAging,
                totalOutstanding: invoicesOutstandingByAge.reduce((s, i) => s + i.amount, 0),
            },
            findings: {
                bySeverity: findingsBySeverity.map((g) => ({ severity: g.severity, count: g._count.id })),
                byStatus: findingsByStatus.map((g) => ({ status: g.status, count: g._count.id })),
                mttrDays,
                totalClosed: findingsClosedWithTime.length,
            },
        };
    }
}
