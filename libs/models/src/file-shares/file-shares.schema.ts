import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document } from 'mongoose';

import { FileUploadModel } from '../file-upload';

const COLLECTION_NAME_FILE_SHARE_LINKS = 'file_share_links';

export type FileShareLinkDocument = FileShareLinkModel & Document;

@Schema({
  collection: COLLECTION_NAME_FILE_SHARE_LINKS,
  timestamps: true,
})
export class FileShareLinkModel {
  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: FileUploadModel.name,
    required: true,
    index: true,
  })
  fileId!: mongoose.Types.ObjectId;

  @Prop({
    required: true,
    unique: true,
    index: true,
  })
  linkToken!: string;

  @Prop({
    required: true,
    index: true,
  })
  expiryDate!: Date;

  @Prop({
    default: true,
    index: true,
  })
  isActive!: boolean;
}

export const FileShareLinkSchema =
  SchemaFactory.createForClass(FileShareLinkModel);
