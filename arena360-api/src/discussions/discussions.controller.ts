import { Controller, Get, Post, Delete, Body, Param, UseGuards, Request, HttpCode, HttpStatus } from '@nestjs/common';
import { DiscussionsService } from './discussions.service';
import { CreateDiscussionDto } from './dto/create-discussion.dto';
import { CreateReplyDto } from './dto/create-reply.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('projects/:projectId/discussions')
export class DiscussionsController {
    constructor(private readonly discussionsService: DiscussionsService) { }

    @Get()
    list(@Request() req: any, @Param('projectId') projectId: string) {
        return this.discussionsService.listForProject(projectId, req.user);
    }

    @Post()
    create(
        @Request() req: any,
        @Param('projectId') projectId: string,
        @Body() dto: CreateDiscussionDto
    ) {
        return this.discussionsService.createThread(projectId, req.user, dto);
    }

    @Delete(':discussionId')
    @HttpCode(HttpStatus.NO_CONTENT)
    deleteThread(
        @Request() req: any,
        @Param('projectId') projectId: string,
        @Param('discussionId') discussionId: string
    ) {
        return this.discussionsService.deleteThread(projectId, discussionId, req.user);
    }

    @Get(':discussionId/replies')
    getReplies(
        @Request() req: any,
        @Param('projectId') projectId: string,
        @Param('discussionId') discussionId: string
    ) {
        return this.discussionsService.getReplies(projectId, discussionId, req.user);
    }

    @Post(':discussionId/replies')
    createReply(
        @Request() req: any,
        @Param('projectId') projectId: string,
        @Param('discussionId') discussionId: string,
        @Body() dto: CreateReplyDto
    ) {
        return this.discussionsService.createReply(projectId, discussionId, req.user, dto);
    }

    @Delete(':discussionId/replies/:replyId')
    @HttpCode(HttpStatus.NO_CONTENT)
    deleteReply(
        @Request() req: any,
        @Param('projectId') projectId: string,
        @Param('discussionId') discussionId: string,
        @Param('replyId') replyId: string
    ) {
        return this.discussionsService.deleteReply(projectId, discussionId, replyId, req.user);
    }
}
