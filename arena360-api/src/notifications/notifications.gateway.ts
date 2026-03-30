import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Server } from 'socket.io';
import { PrismaService } from '../common/prisma.service';
import { ScopeUtils, UserWithRoles } from '../common/utils/scope.utils';

@WebSocketGateway({
  cors: { origin: '*' },
  path: '/ws',
  transports: ['websocket', 'polling'],
})
export class NotificationsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(NotificationsGateway.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  private discussionRoom(projectId: string) {
    return `project-discussions:${projectId}`;
  }

  private async resolveSocketUser(client: any): Promise<UserWithRoles | null> {
    if (client.data?.user) {
      return client.data.user as UserWithRoles;
    }

    const token =
      client.handshake?.auth?.token ||
      client.handshake?.query?.token;
    if (!token) {
      return null;
    }

    const secret = this.config.get<string>('JWT_SECRET') || 'super-secret-dev-key-change-me';
    const payload = this.jwtService.verify(token, { secret });
    const userId = payload.sub;
    if (!userId) {
      return null;
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        clientMemberships: {
          orderBy: { createdAt: 'desc' },
        },
        projectMemberships: {
          include: {
            project: {
              select: { clientId: true },
            },
          },
        },
      },
    });

    if (!user) {
      return null;
    }

    const { passwordHash, twoFactorSecret, recoveryCodes, ...safe } = user as any;
    client.data = {
      ...(client.data || {}),
      user: safe,
    };

    return safe as UserWithRoles;
  }

  async handleConnection(client: any) {
    try {
      const user = await this.resolveSocketUser(client);
      if (!user?.id) {
        client.disconnect();
        return;
      }
      await client.join(`user:${user.id}`);
      this.logger.debug(`User ${user.id} connected (socket ${client.id})`);
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(client: any) {
    this.logger.debug(`Socket disconnected: ${client.id}`);
  }

  emitToUser(userId: string, payload: { id: string; title: string; body?: string; linkUrl?: string; type?: string; entityId?: string; entityType?: string; createdAt?: string }) {
    this.server.to(`user:${userId}`).emit('notification', payload);
  }

  emitDiscussionEvent(projectId: string, event: string, payload: any) {
    this.server.to(this.discussionRoom(projectId)).emit(event, payload);
  }

  @SubscribeMessage('project-discussions:join')
  async handleProjectDiscussionJoin(
    @ConnectedSocket() client: any,
    @MessageBody() body: { projectId?: string },
  ) {
    try {
      const user = await this.resolveSocketUser(client);
      if (!user || !body?.projectId) {
        return { ok: false };
      }

      const project = await this.prisma.project.findFirst({
        where: {
          id: body.projectId,
          deletedAt: null,
          ...ScopeUtils.projectScope(user),
        },
        select: { id: true },
      });

      if (!project) {
        return { ok: false };
      }

      await client.join(this.discussionRoom(body.projectId));
      return { ok: true, projectId: body.projectId };
    } catch (error) {
      this.logger.debug(`Failed to join discussion room: ${error?.message || error}`);
      return { ok: false };
    }
  }

  @SubscribeMessage('project-discussions:leave')
  async handleProjectDiscussionLeave(
    @ConnectedSocket() client: any,
    @MessageBody() body: { projectId?: string },
  ) {
    if (!body?.projectId) {
      return { ok: false };
    }

    await client.leave(this.discussionRoom(body.projectId));
    return { ok: true };
  }
}
