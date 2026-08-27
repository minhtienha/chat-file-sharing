import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document, Types } from 'mongoose';

import { User } from '../user';

const COLLECTION_NAME_FILES = 'files';

export type FileUploadDocument = FileUploadModel & Document;

@Schema({
  collection: COLLECTION_NAME_FILES,
  timestamps: true,
})
export class FileUploadModel {
  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: User.name,
    required: true,
    index: true,
  })
  ownerId!: Types.ObjectId;

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    unique: true,
  })
  gridfsFileId!: Types.ObjectId;

  @Prop({
    required: true,
    trim: true,
  })
  name!: string;

  @Prop({
    index: true,
    lowercase: true,
  })
  extension?: string;

  @Prop()
  contentType?: string;

  @Prop({
    required: true,
    min: 0,
  })
  size!: number;

  @Prop({
    index: true,
  })
  contentHash?: string;

  @Prop({
    required: true,
    enum: ['gridfs', 'minio', 'external'],
    default: 'gridfs',
    index: true,
  })
  source!: 'gridfs' | 'minio' | 'external';

  @Prop({
    default: 0,
    min: 0,
  })
  downloads!: number;

  @Prop({
    type: Object,
    default: {},
  })
  metadata?: Record<string, any>;
}

export const FileUploadSchema = SchemaFactory.createForClass(FileUploadModel);
