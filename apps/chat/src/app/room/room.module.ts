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
} from '@sharing/models';

@Module({
  imports: [
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
    ]),
  ],
  controllers: [RoomController],
  providers: [RoomService],
})
export class RoomModule {}
