import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: true,
    credentials: true,
  },
})
export class ChatGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  public server: Server;

  afterInit(server: Server) {
    this.server = server;
    console.log('🚀 WebSocket server đã được khởi tạo');
  }

  handleConnection(client: Socket) {
    const userId =
      client.handshake.auth?.userId || client.handshake.query?.userId;
    if (userId) {
      client.join(String(userId));
      console.log(`✅ Client ${client.id} joined personal room: ${userId}`);
    } else {
      console.log(`✅ Client connected: ${client.id}`);
    }
  }

  handleDisconnect(client: Socket) {
    console.log(`❌ Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('joinUser')
  handleJoinUser(
    @MessageBody() data: { userId: string },
    @ConnectedSocket() client: Socket,
  ) {
    if (data?.userId) {
      client.join(String(data.userId));
      console.log(
        `👤 Client ${client.id} đã join vào room user: ${data.userId}`,
      );
    }
  }

  @SubscribeMessage('joinRoom')
  handleJoinRoom(
    @MessageBody() data: { roomId: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.join(data.roomId);
    console.log(`📥 Client ${client.id} đã join vào phòng: ${data.roomId}`);
  }

  @SubscribeMessage('leaveRoom')
  handleLeaveRoom(
    @MessageBody() data: { roomId: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.leave(data.roomId);
    console.log(`Client ${client.id} đã rời phòng: ${data.roomId}`);
  }

  emitNewMessage(roomId: string, message: any, memberIds?: string[]) {
    // 1. Emit vào room chat cho các client đang mở phòng này
    this.server.to(roomId).emit('newMessage', message);

    // 2. Emit newRoomMessage trực tiếp tới từng cá nhân các thành viên để cập nhật danh sách phòng (tránh bắn lặp 2 lần sự kiện)
    if (memberIds && Array.isArray(memberIds)) {
      memberIds.forEach((mId) => {
        const idStr = mId.toString();
        this.server.to(idStr).emit('newRoomMessage', message);
      });
    }
  }

  @SubscribeMessage('typing')
  handleTyping(
    @MessageBody() data: { roomId: string; userName: string; userId: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.to(data.roomId).emit('userTyping', {
      userId: data.userId,
      userName: data.userName,
      roomId: data.roomId,
    });
  }

  @SubscribeMessage('stopTyping')
  handleStopTyping(
    @MessageBody() data: { roomId: string; userId: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.to(data.roomId).emit('userStoppedTyping', {
      userId: data.userId,
      roomId: data.roomId,
    });
  }

  @SubscribeMessage('markAsRead')
  handleMarkAsRead(
    @MessageBody() data: { roomId: string; userId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const now = new Date().toISOString();
    const readPayload = {
      roomId: data.roomId,
      userId: data.userId,
      lastReadAt: now,
    };

    this.server.to(data.roomId).emit('roomRead', readPayload);
    this.server.to(String(data.userId)).emit('roomRead', readPayload);
    this.server.to(data.roomId).emit('messagesSeen', {
      roomId: data.roomId,
      userId: data.userId,
      seenAt: now,
    });
  }

  // @SubscribeMessage('newMessage')
  // handleEvent(
  //   @MessageBody() data: { message: string; roomId: string },
  //   @ConnectedSocket() client: Socket,
  // ) {
  //   console.log(`📩 Received from ${client.id}:`, data);

  //   this.server.emit('response', {
  //     from: client.id,
  //     data,
  //   });
  // }
}
