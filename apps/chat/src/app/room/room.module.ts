import { Module } from '@nestjs/common';
import { RoomService } from './room.service';
import { RoomController } from './room.controller';
import { MongooseModule } from '@nestjs/mongoose';
import {
  ChatRoom,
  ChatRoomMember,
  ChatRoomMemberSchema,
  ChatRoomSchema,
  Message,
  MessageSchema,
  User,
  UserSchema,
} from '@sharing/models';

import { ChatGatewayModule } from '../chat-gateway/chat-gateway.module';

@Module({
  imports: [
    ChatGatewayModule,
    MongooseModule.forFeature([
      {
        name: Message.name,
        schema: MessageSchema,
      },
      {
        name: ChatRoom.name,
        schema: ChatRoomSchema,
      },
      {
        name: ChatRoomMember.name,
        schema: ChatRoomMemberSchema,
      },
      {
        name: User.name,
        schema: UserSchema,
      },
    ]),
  ],
  controllers: [RoomController],
  providers: [RoomService],
})
export class RoomModule {}
