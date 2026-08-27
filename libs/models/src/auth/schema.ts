import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document } from 'mongoose';
import { User } from '../user/index';

export type AuthDocument = Auth & Document;

@Schema({ timestamps: true })
export class Auth {
  @Prop({ required: true })
  token!: string;

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: User.name,
    required: true,
  })
  user!: mongoose.Schema.Types.ObjectId | string;

  @Prop({ required: true })
  expiresAt!: Date;
}

export const AuthSchema = SchemaFactory.createForClass(Auth);
AuthSchema.index({ token: 1 });
AuthSchema.index({ user: 1 });
AuthSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
