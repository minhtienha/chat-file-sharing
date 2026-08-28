import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document } from 'mongoose';
import { DefaultSchema } from '../common';
import { ChatRoom } from '../chat-room/chat-room.schema';

export type ChatRoomMemberDocument = ChatRoomMember & Document;

@Schema({
  timestamps: true,
})
export class ChatRoomMember extends DefaultSchema {
  @Prop({
    required: true,
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ChatRoom',
    index: true,
  })
  roomId!: mongoose.Types.ObjectId | ChatRoom;

  @Prop({
    required: true,
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true,
  })
  userId!: mongoose.Types.ObjectId;

  @Prop({ type: Date, default: null })
  lastReadAt?: Date | null;
}

export const ChatRoomMemberSchema =
  SchemaFactory.createForClass(ChatRoomMember);

ChatRoomMemberSchema.index({ roomId: 1, userId: 1 }, { unique: true });
