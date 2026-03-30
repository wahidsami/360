import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { UserWithRoles, ScopeUtils } from '../common/utils/scope.utils';
import { CreateDiscussionDto } from './dto/create-discussion.dto';
import { CreateReplyDto } from './dto/create-reply.dto';
import { NotificationsGateway } from '../notifications/notifications.gateway';

@Injectable()
export class DiscussionsService {
    constructor(
        private prisma: PrismaService,
        private readonly notificationsGateway: NotificationsGateway,
    ) { }

    private toDiscussionPayload(d: any, clientRequestId?: string) {
        return {
            id: d.id,
            projectId: d.projectId,
            title: d.title,
            body: d.body,
            authorId: d.authorId,
            authorName: d.author.name,
            authorAvatar: d.author.avatar,
            replyCount: d._count?.replies ?? 0,
            lastReplyAt: d.replies?.[0]?.createdAt ?? null,
            createdAt: d.createdAt,
            updatedAt: d.updatedAt,
            ...(clientRequestId ? { clientRequestId } : {}),
        };
    }

    private toReplyPayload(r: any, clientRequestId?: string) {
        return {
            id: r.id,
            discussionId: r.discussionId,
            body: r.body,
            authorId: r.authorId,
            authorName: r.author.name,
            authorAvatar: r.author.avatar,
            createdAt: r.createdAt,
            ...(clientRequestId ? { clientRequestId } : {}),
        };
    }

    async listForProject(projectId: string, user: UserWithRoles) {
        // Verify project belongs to org
        const project = await this.prisma.project.findFirst({
            where: { id: projectId, ...ScopeUtils.projectScope(user) }
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

        return discussions.map((discussion) => this.toDiscussionPayload(discussion));
    }

    async createThread(projectId: string, user: UserWithRoles, dto: CreateDiscussionDto) {
        const project = await this.prisma.project.findFirst({
            where: { id: projectId, ...ScopeUtils.projectScope(user) }
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
                author: { select: { id: true, name: true, avatar: true } },
                _count: { select: { replies: true } },
                replies: {
                    orderBy: { createdAt: 'desc' },
                    take: 1,
                },
            }
        });

        const payload = this.toDiscussionPayload(discussion, dto.clientRequestId);
        this.notificationsGateway.emitDiscussionEvent(projectId, 'discussion:thread-created', payload);
        return payload;
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

        return replies.map((reply) => this.toReplyPayload(reply));
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
        const updatedDiscussion = await this.prisma.discussion.update({
            where: { id: discussionId },
            data: { updatedAt: new Date() }
        });

        const replyCount = await this.prisma.discussionReply.count({
            where: { discussionId, orgId: user.orgId },
        });

        const replyPayload = this.toReplyPayload(reply, dto.clientRequestId);
        this.notificationsGateway.emitDiscussionEvent(projectId, 'discussion:reply-created', {
            projectId,
            discussionId,
            reply: replyPayload,
            discussion: {
                id: discussionId,
                replyCount,
                lastReplyAt: reply.createdAt,
                updatedAt: updatedDiscussion.updatedAt,
            },
        });

        return replyPayload;
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
        this.notificationsGateway.emitDiscussionEvent(projectId, 'discussion:thread-deleted', {
            projectId,
            discussionId,
        });
    }

    async deleteReply(projectId: string, discussionId: string, replyId: string, user: UserWithRoles) {
        const discussion = await this.prisma.discussion.findFirst({
            where: { id: discussionId, projectId, orgId: user.orgId }
        });
        if (!discussion) throw new NotFoundException('Discussion not found');

        const reply = await this.prisma.discussionReply.findFirst({
            where: { id: replyId, discussionId, orgId: user.orgId }
        });
        if (!reply) throw new NotFoundException('Reply not found');

        const adminRoles = ['SUPER_ADMIN', 'OPS', 'PM'];
        if (reply.authorId !== user.id && !adminRoles.includes(user.role)) {
            throw new ForbiddenException('You can only delete your own replies');
        }

        await this.prisma.discussionReply.delete({ where: { id: replyId } });

        const latestReply = await this.prisma.discussionReply.findFirst({
            where: { discussionId, orgId: user.orgId },
            orderBy: { createdAt: 'desc' },
            select: { createdAt: true },
        });

        const replyCount = await this.prisma.discussionReply.count({
            where: { discussionId, orgId: user.orgId },
        });

        const updatedDiscussion = await this.prisma.discussion.update({
            where: { id: discussionId },
            data: {
                updatedAt: latestReply?.createdAt ?? discussion.createdAt,
            },
        });

        this.notificationsGateway.emitDiscussionEvent(projectId, 'discussion:reply-deleted', {
            projectId,
            discussionId,
            replyId,
            discussion: {
                id: discussionId,
                replyCount,
                lastReplyAt: latestReply?.createdAt ?? null,
                updatedAt: updatedDiscussion.updatedAt,
            },
        });
    }
}
