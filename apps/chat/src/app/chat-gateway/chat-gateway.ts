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

@WebSocketGateway({ cors: { origin: '*' } })
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
    console.log(`✅ Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`❌ Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('joinRoom')
  handleJoinRoom(
    @MessageBody() roomId: string,
    @ConnectedSocket() client: Socket,
  ) {
    client.join(roomId);
    console.log(`📥 Client ${client.id} đã join vào phòng: ${roomId}`);
  }

  @SubscribeMessage('leaveRoom')
  handleLeaveRoom(
    @MessageBody() data: { roomId: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.leave(data.roomId);
    console.log(`Client ${client.id} đã rời phòng: ${data.roomId}`);
  }

  emitNewMessage(roomId: string, message: any) {
    this.server.to(roomId).emit('newMessage', message);
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
