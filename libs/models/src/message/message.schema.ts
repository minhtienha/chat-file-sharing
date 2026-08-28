import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document } from 'mongoose';
import { DefaultSchema } from '../common';

export enum MessageType {
  TEXT = 'TEXT',
  //   FILE = 'file',
}

export type MessageDocument = Message & Document;

@Schema({
  timestamps: true,
})
export class Message extends DefaultSchema {
  @Prop({
    required: true,
    type: mongoose.Schema.Types.ObjectId,
    index: true,
  })
  roomId!: mongoose.Types.ObjectId;

  @Prop({
    required: true,
    type: mongoose.Schema.Types.ObjectId,
    index: true,
  })
  senderId!: mongoose.Types.ObjectId;

  @Prop()
  content?: string;

  //   @Prop({ type: mongoose.Schema.Types.ObjectId })
  //   fileId?: mongoose.Types.ObjectId;

  @Prop({
    required: true,
    enum: MessageType,
  })
  type!: MessageType;
}

export const MessageSchema = SchemaFactory.createForClass(Message);

MessageSchema.index({
  roomId: 1,
  createdAt: -1,
});
