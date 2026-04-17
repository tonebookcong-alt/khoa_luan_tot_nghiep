import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ConversationsService } from './conversations.service';

interface AuthSocket extends Socket {
  userId: string;
}

@WebSocketGateway({
  cors: { origin: '*', credentials: true },
  namespace: '/chat',
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly conversationsService: ConversationsService,
  ) {}

  async handleConnection(client: AuthSocket) {
    try {
      const token =
        (client.handshake.auth as { token?: string }).token ??
        (client.handshake.headers['authorization'] as string | undefined)?.split(' ')[1];

      if (!token) {
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify<{ sub: string }>(token, {
        secret: this.config.get<string>('JWT_ACCESS_SECRET') ?? 'access_secret',
      });

      client.userId = payload.sub;
      client.join(`user:${payload.sub}`);
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(_client: AuthSocket) {
    // Cleanup handled by socket.io automatically
  }

  @SubscribeMessage('join_conversation')
  handleJoin(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody() data: { conversationId: string },
  ) {
    client.join(`conv:${data.conversationId}`);
    return { event: 'joined', conversationId: data.conversationId };
  }

  @SubscribeMessage('leave_conversation')
  handleLeave(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody() data: { conversationId: string },
  ) {
    client.leave(`conv:${data.conversationId}`);
  }

  @SubscribeMessage('send_message')
  async handleMessage(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody() data: { conversationId: string; content: string },
  ) {
    if (!client.userId || !data.conversationId || !data.content?.trim()) return;

    try {
      const message = await this.conversationsService.createMessage(
        data.conversationId,
        client.userId,
        data.content.trim(),
      );

      this.server
        .to(`conv:${data.conversationId}`)
        .emit('message_received', message);
    } catch {
      client.emit('error', { message: 'Không thể gửi tin nhắn' });
    }
  }

  @SubscribeMessage('user_typing')
  handleTyping(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody() data: { conversationId: string; isTyping: boolean },
  ) {
    client.to(`conv:${data.conversationId}`).emit('user_typing', {
      userId: client.userId,
      isTyping: data.isTyping,
    });
  }
}