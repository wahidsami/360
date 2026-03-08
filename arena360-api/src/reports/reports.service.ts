import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { UserWithRoles } from '../common/utils/scope.utils';
import { CreateReportDto, UpdateReportDto } from './dto/report.dto';
import { ReportGeneratorService } from './report-generator.service';

@Injectable()
export class ReportsService {
    constructor(
        private prisma: PrismaService,
        private reportGenerator: ReportGeneratorService,
    ) { }

    async findAll(projectId: string, user: UserWithRoles) {
        // Verify project exists and user has access
        const project = await this.prisma.project.findFirst({
            where: { id: projectId, orgId: user.orgId }
        });

        if (!project) {
            throw new NotFoundException('Project not found');
        }

        const clientRoles = ['CLIENT_OWNER', 'CLIENT_MANAGER', 'CLIENT_MEMBER'];
        const isClientUser = clientRoles.includes(user.role);

        return this.prisma.report.findMany({
            where: {
                projectId,
                orgId: user.orgId,
                deletedAt: null,
                // Client users only see CLIENT visibility reports
                ...(isClientUser && { visibility: 'CLIENT' })
            },
            include: {
                createdBy: {
                    select: { id: true, name: true, email: true }
                }
            },
            orderBy: [
                { publishedAt: 'desc' }, // Published reports first
                { createdAt: 'desc' }
            ]
        });
    }

    async create(projectId: string, user: UserWithRoles, dto: CreateReportDto) {
        // Verify project exists and user has access
        const project = await this.prisma.project.findFirst({
            where: { id: projectId, orgId: user.orgId }
        });

        if (!project) {
            throw new NotFoundException('Project not found');
        }

        // Only internal roles can create reports
        const internalRoles = ['SUPER_ADMIN', 'OPS', 'PM', 'DEV'];
        if (!internalRoles.includes(user.role)) {
            throw new ForbiddenException('Only internal staff can create reports');
        }

        // DEV can only create INTERNAL DRAFT reports
        const visibility = dto.visibility || 'INTERNAL';
        const status = dto.status || 'DRAFT';

        if (user.role === 'DEV') {
            if (visibility === 'CLIENT') {
                throw new ForbiddenException('DEV role can only create INTERNAL reports');
            }
            if (status !== 'DRAFT') {
                throw new ForbiddenException('DEV role can only create DRAFT reports');
            }
        }

        return this.prisma.report.create({
            data: {
                ...dto,
                visibility,
                status,
                projectId,
                createdById: user.id,
                orgId: user.orgId
            },
            include: {
                createdBy: {
                    select: { id: true, name: true, email: true }
                }
            }
        });
    }

    async update(projectId: string, reportId: string, user: UserWithRoles, dto: UpdateReportDto) {
        // Verify report exists and belongs to project
        const report = await this.prisma.report.findFirst({
            where: {
                id: reportId,
                projectId,
                orgId: user.orgId
            }
        });

        if (!report) {
            throw new NotFoundException('Report not found');
        }

        const internalRoles = ['SUPER_ADMIN', 'OPS', 'PM', 'DEV'];
        if (!internalRoles.includes(user.role)) {
            throw new ForbiddenException('Only internal staff can update reports');
        }

        // DEV cannot publish or archive reports
        if (user.role === 'DEV') {
            if (dto.status && dto.status !== 'DRAFT') {
                throw new ForbiddenException('DEV role cannot publish or archive reports');
            }
            if (dto.visibility === 'CLIENT') {
                throw new ForbiddenException('DEV role cannot set visibility to CLIENT');
            }
        }

        // If publishing, set publishedAt timestamp
        const updateData: any = { ...dto };
        if (dto.status === 'PUBLISHED' && !report.publishedAt) {
            updateData.publishedAt = new Date();
        }

        return this.prisma.report.update({
            where: { id: reportId },
            data: updateData,
            include: {
                createdBy: {
                    select: { id: true, name: true, email: true }
                }
            }
        });
    }

    async delete(projectId: string, reportId: string, user: UserWithRoles) {
        // Verify report exists and belongs to project
        const report = await this.prisma.report.findFirst({
            where: {
                id: reportId,
                projectId,
                orgId: user.orgId
            }
        });

        if (!report) {
            throw new NotFoundException('Report not found');
        }

        // Only PM/OPS/SUPER_ADMIN can delete reports (DEV cannot)
        const adminRoles = ['SUPER_ADMIN', 'OPS', 'PM'];
        if (!adminRoles.includes(user.role)) {
            throw new ForbiddenException('Only SUPER_ADMIN, OPS, or PM can delete reports');
        }

        await this.prisma.report.update({
            where: { id: reportId },
            data: { deletedAt: new Date() }
        });
        return { success: true };
    }

    async generate(projectId: string, reportId: string | null, format: 'pptx' | 'pdf', user: UserWithRoles) {
        const project = await this.prisma.project.findFirst({
            where: { id: projectId, orgId: user.orgId }
        });
        if (!project) throw new NotFoundException('Project not found');
        const internalRoles = ['SUPER_ADMIN', 'OPS', 'PM', 'DEV'];
        if (!internalRoles.includes(user.role)) throw new ForbiddenException('Only internal staff can generate reports');

        let report = reportId
            ? await this.prisma.report.findFirst({ where: { id: reportId, projectId, orgId: user.orgId } })
            : null;
        if (reportId && !report) throw new NotFoundException('Report not found');
        if (!report) {
            report = await this.prisma.report.create({
                data: {
                    projectId,
                    orgId: user.orgId,
                    title: `Generated Report ${format.toUpperCase()} ${new Date().toISOString().slice(0, 10)}`,
                    description: '',
                    createdById: user.id,
                },
            });
        }

        const title = report.title || project.name;
        const fileKey =
            format === 'pptx'
                ? await this.reportGenerator.generatePpt(projectId, report.id, user.orgId, title)
                : await this.reportGenerator.generatePdf(projectId, report.id, user.orgId, title);

        await this.prisma.report.update({
            where: { id: report.id },
            data: { generatedFileKey: fileKey, generatedAt: new Date() },
        });
        return { reportId: report.id, generatedFileKey: fileKey, format };
    }

    getDownloadPath(generatedFileKey: string): string {
        return this.reportGenerator.getFilePath(generatedFileKey);
    }

    async getReportForDownload(projectId: string, reportId: string, user: UserWithRoles) {
        const report = await this.prisma.report.findFirst({
            where: { id: reportId, projectId, orgId: user.orgId }
        });
        if (!report) throw new NotFoundException('Report not found');
        if (!report.generatedFileKey) throw new NotFoundException('Report not generated yet');
        const ext = report.generatedFileKey.split('.').pop();
        return { path: this.getDownloadPath(report.generatedFileKey), filename: `${report.title || 'report'}.${ext}` };
    }

    async uploadFile(projectId: string, reportId: string, user: UserWithRoles, file: Express.Multer.File) {
        const report = await this.prisma.report.findFirst({
            where: { id: reportId, projectId, orgId: user.orgId }
        });
        if (!report) throw new NotFoundException('Report not found');

        const internalRoles = ['SUPER_ADMIN', 'OPS', 'PM', 'DEV'];
        if (!internalRoles.includes(user.role)) {
            throw new ForbiddenException('Only internal staff can upload reports');
        }

        const dir = join(process.cwd(), 'uploads', 'reports');
        if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

        const ext = file.originalname.split('.').pop();
        const generatedFileKey = `reports/${reportId}_manual.${ext}`;
        const filePath = join(process.cwd(), 'uploads', generatedFileKey);

        const fs = require('fs');
        fs.writeFileSync(filePath, file.buffer);

        return this.prisma.report.update({
            where: { id: reportId },
            data: {
                generatedFileKey,
                generatedAt: new Date(),
            }
        });
    }
}
