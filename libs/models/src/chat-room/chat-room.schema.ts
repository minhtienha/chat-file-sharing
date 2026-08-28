import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document } from 'mongoose';
import { DefaultSchema } from '../common';

export type ChatRoomDocument = ChatRoom & Document;

@Schema({
  timestamps: true,
})
export class ChatRoom extends DefaultSchema {
  @Prop()
  name?: string;

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
  })
  lastMessageId?: mongoose.Types.ObjectId;
}

export const ChatRoomSchema = SchemaFactory.createForClass(ChatRoom);

ChatRoomSchema.index({
  members: 1,
});
