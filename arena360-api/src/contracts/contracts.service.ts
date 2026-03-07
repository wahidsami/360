import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { UserWithRoles } from '../common/utils/scope.utils';
import { CreateContractDto, UpdateContractDto } from './dto/contract.dto';

@Injectable()
export class ContractsService {
    constructor(private prisma: PrismaService) { }

    async findAll(projectId: string, user: UserWithRoles) {
        // Verify project exists and user has access
        const project = await this.prisma.project.findFirst({
            where: { id: projectId, orgId: user.orgId }
        });

        if (!project) {
            throw new NotFoundException('Project not found');
        }

        // DEV role has NO access to contracts
        if (user.role === 'DEV') {
            throw new ForbiddenException('DEV role does not have access to contracts');
        }

        // Client users cannot view contracts
        const clientRoles = ['CLIENT_OWNER', 'CLIENT_MANAGER', 'CLIENT_MEMBER'];
        if (clientRoles.includes(user.role)) {
            throw new ForbiddenException('Client users do not have access to contracts');
        }

        return this.prisma.contract.findMany({
            where: {
                projectId,
                orgId: user.orgId
            },
            include: {
                createdBy: {
                    select: { id: true, name: true, email: true }
                },
                invoices: {
                    select: { id: true, invoiceNumber: true, amount: true, status: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
    }

    async create(projectId: string, user: UserWithRoles, dto: CreateContractDto) {
        // Verify project exists and user has access
        const project = await this.prisma.project.findFirst({
            where: { id: projectId, orgId: user.orgId }
        });

        if (!project) {
            throw new NotFoundException('Project not found');
        }

        // Only PM/OPS/SUPER_ADMIN can create contracts
        const adminRoles = ['SUPER_ADMIN', 'OPS', 'PM'];
        if (!adminRoles.includes(user.role)) {
            throw new ForbiddenException('Only SUPER_ADMIN, OPS, or PM can create contracts');
        }

        return this.prisma.contract.create({
            data: {
                ...dto,
                startDate: new Date(dto.startDate),
                endDate: dto.endDate ? new Date(dto.endDate) : null,
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

    async update(projectId: string, contractId: string, user: UserWithRoles, dto: UpdateContractDto) {
        // Verify contract exists and belongs to project
        const contract = await this.prisma.contract.findFirst({
            where: {
                id: contractId,
                projectId,
                orgId: user.orgId
            }
        });

        if (!contract) {
            throw new NotFoundException('Contract not found');
        }

        // Only PM/OPS/SUPER_ADMIN can update contracts
        const adminRoles = ['SUPER_ADMIN', 'OPS', 'PM'];
        if (!adminRoles.includes(user.role)) {
            throw new ForbiddenException('Only SUPER_ADMIN, OPS, or PM can update contracts');
        }

        const updateData: any = { ...dto };
        if (dto.startDate) updateData.startDate = new Date(dto.startDate);
        if (dto.endDate) updateData.endDate = new Date(dto.endDate);

        return this.prisma.contract.update({
            where: { id: contractId },
            data: updateData,
            include: {
                createdBy: {
                    select: { id: true, name: true, email: true }
                }
            }
        });
    }

    async delete(projectId: string, contractId: string, user: UserWithRoles) {
        // Verify contract exists and belongs to project
        const contract = await this.prisma.contract.findFirst({
            where: {
                id: contractId,
                projectId,
                orgId: user.orgId
            }
        });

        if (!contract) {
            throw new NotFoundException('Contract not found');
        }

        // Only SUPER_ADMIN/OPS/PM can delete contracts
        const adminRoles = ['SUPER_ADMIN', 'OPS', 'PM'];
        if (!adminRoles.includes(user.role)) {
            throw new ForbiddenException('Only SUPER_ADMIN, OPS, or PM can delete contracts');
        }

        await this.prisma.contract.delete({
            where: { id: contractId }
        });
    }
}
