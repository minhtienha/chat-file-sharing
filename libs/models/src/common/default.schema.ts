import { Prop } from '@nestjs/mongoose';
import mongoose from 'mongoose';
import { User, UserDocument } from '../user/user.schema';

export class DefaultSchema {
  @Prop()
  tags?: string[];

  @Prop({ default: true })
  isPublic?: boolean;

  @Prop({ default: [] })
  fullTextTokens?: string[] | number[];

  createdAt?: Date | string;

  updatedAt?: Date | string;

  @Prop()
  __isDeleted?: boolean;

  @Prop()
  deletedAt?: Date;

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: User?.name ?? 'User',
  })
  createdBy?: string | mongoose.Types.ObjectId | UserDocument;

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: User?.name ?? 'User',
  })
  deletedBy?: string | mongoose.Types.ObjectId | UserDocument;

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: User?.name ?? 'User',
  })
  updatedBy?: string | mongoose.Types.ObjectId | UserDocument;

  @Prop()
  tenant?: string;
}
