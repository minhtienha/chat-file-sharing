import { Module } from '@nestjs/common';
import { MessageService } from './message.service';
import { MessageController } from './message.controller';
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
  controllers: [MessageController],
  providers: [MessageService],
})
export class MessageModule {}
