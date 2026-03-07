import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Server } from 'socket.io';

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
  ) {}

  async handleConnection(client: any) {
    try {
      const token =
        client.handshake?.auth?.token ||
        client.handshake?.query?.token;
      if (!token) {
        client.disconnect();
        return;
      }
      const secret = this.config.get<string>('JWT_SECRET') || 'super-secret-dev-key-change-me';
      const payload = this.jwtService.verify(token, { secret });
      const userId = payload.sub;
      if (!userId) {
        client.disconnect();
        return;
      }
      await client.join(`user:${userId}`);
      this.logger.debug(`User ${userId} connected (socket ${client.id})`);
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
}
