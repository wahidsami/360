import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { UserWithRoles } from '../common/utils/scope.utils';
import { CreateDiscussionDto } from './dto/create-discussion.dto';
import { CreateReplyDto } from './dto/create-reply.dto';

@Injectable()
export class DiscussionsService {
    constructor(private prisma: PrismaService) { }

    async listForProject(projectId: string, user: UserWithRoles) {
        // Verify project belongs to org
        const project = await this.prisma.project.findFirst({
            where: { id: projectId, orgId: user.orgId }
        });
        if (!project) throw new NotFoundException('Project not found');

        const discussions = await this.prisma.discussion.findMany({
            where: { projectId, orgId: user.orgId },
            include: {
                author: { select: { id: true, name: true, avatar: true } },
                _count: { select: { replies: true } },
                replies: {
                    orderBy: { createdAt: 'desc' },
                    take: 1,
                    include: { author: { select: { id: true, name: true } } }
                }
            },
            orderBy: { updatedAt: 'desc' }
        });

        return discussions.map(d => ({
            id: d.id,
            projectId: d.projectId,
            title: d.title,
            body: d.body,
            authorId: d.authorId,
            authorName: d.author.name,
            authorAvatar: d.author.avatar,
            replyCount: d._count.replies,
            lastReplyAt: d.replies[0]?.createdAt ?? null,
            createdAt: d.createdAt,
            updatedAt: d.updatedAt,
        }));
    }

    async createThread(projectId: string, user: UserWithRoles, dto: CreateDiscussionDto) {
        const project = await this.prisma.project.findFirst({
            where: { id: projectId, orgId: user.orgId }
        });
        if (!project) throw new NotFoundException('Project not found');

        const discussion = await this.prisma.discussion.create({
            data: {
                orgId: user.orgId,
                projectId,
                authorId: user.id,
                title: dto.title,
                body: dto.body,
            },
            include: {
                author: { select: { id: true, name: true, avatar: true } }
            }
        });

        return {
            id: discussion.id,
            projectId: discussion.projectId,
            title: discussion.title,
            body: discussion.body,
            authorId: discussion.authorId,
            authorName: discussion.author.name,
            authorAvatar: discussion.author.avatar,
            replyCount: 0,
            createdAt: discussion.createdAt,
            updatedAt: discussion.updatedAt,
        };
    }

    async getReplies(projectId: string, discussionId: string, user: UserWithRoles) {
        const discussion = await this.prisma.discussion.findFirst({
            where: { id: discussionId, projectId, orgId: user.orgId }
        });
        if (!discussion) throw new NotFoundException('Discussion not found');

        const replies = await this.prisma.discussionReply.findMany({
            where: { discussionId, orgId: user.orgId },
            include: {
                author: { select: { id: true, name: true, avatar: true } }
            },
            orderBy: { createdAt: 'asc' }
        });

        return replies.map(r => ({
            id: r.id,
            discussionId: r.discussionId,
            body: r.body,
            authorId: r.authorId,
            authorName: r.author.name,
            authorAvatar: r.author.avatar,
            createdAt: r.createdAt,
        }));
    }

    async createReply(projectId: string, discussionId: string, user: UserWithRoles, dto: CreateReplyDto) {
        const discussion = await this.prisma.discussion.findFirst({
            where: { id: discussionId, projectId, orgId: user.orgId }
        });
        if (!discussion) throw new NotFoundException('Discussion not found');

        const reply = await this.prisma.discussionReply.create({
            data: {
                orgId: user.orgId,
                discussionId,
                authorId: user.id,
                body: dto.body,
            },
            include: {
                author: { select: { id: true, name: true, avatar: true } }
            }
        });

        // Bump the discussion updatedAt
        await this.prisma.discussion.update({
            where: { id: discussionId },
            data: { updatedAt: new Date() }
        });

        return {
            id: reply.id,
            discussionId: reply.discussionId,
            body: reply.body,
            authorId: reply.authorId,
            authorName: reply.author.name,
            authorAvatar: reply.author.avatar,
            createdAt: reply.createdAt,
        };
    }

    async deleteThread(projectId: string, discussionId: string, user: UserWithRoles) {
        const discussion = await this.prisma.discussion.findFirst({
            where: { id: discussionId, projectId, orgId: user.orgId }
        });
        if (!discussion) throw new NotFoundException('Discussion not found');

        const adminRoles = ['SUPER_ADMIN', 'OPS', 'PM'];
        if (discussion.authorId !== user.id && !adminRoles.includes(user.role)) {
            throw new ForbiddenException('You can only delete your own discussions');
        }

        await this.prisma.discussion.delete({ where: { id: discussionId } });
    }

    async deleteReply(projectId: string, discussionId: string, replyId: string, user: UserWithRoles) {
        const reply = await this.prisma.discussionReply.findFirst({
            where: { id: replyId, discussionId, orgId: user.orgId }
        });
        if (!reply) throw new NotFoundException('Reply not found');

        const adminRoles = ['SUPER_ADMIN', 'OPS', 'PM'];
        if (reply.authorId !== user.id && !adminRoles.includes(user.role)) {
            throw new ForbiddenException('You can only delete your own replies');
        }

        await this.prisma.discussionReply.delete({ where: { id: replyId } });
    }
}
