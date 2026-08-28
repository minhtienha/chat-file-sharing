import { Module } from '@nestjs/common';
import { APP_PIPE } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MessageModule } from './message/message.module';
import { RoomModule } from './room/room.module';
import { ZodValidationPipe } from 'nestjs-zod';
import { CommonModule } from '@sharing/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  ChatRoom,
  ChatRoomSchema,
  ChatRoomMember,
  ChatRoomMemberSchema,
  Message,
  MessageSchema,
} from '@sharing/models';

@Module({
  imports: [
    CommonModule,
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
    MessageModule,
    RoomModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    AppService,
    {
      provide: APP_PIPE,
      useClass: ZodValidationPipe,
    },
  ],
})
export class AppModule {}
