import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document } from 'mongoose';

const COLLECTION_NAME_FILES = 'fs.files';
export type GridFSFileDocument = GridFSFile & Document;
@Schema({ collection: COLLECTION_NAME_FILES })
export class GridFSFile {
  @Prop()
  filename?: string;

  @Prop()
  contentType?: string;

  @Prop()
  length?: number;

  @Prop()
  chunkSize?: number;

  @Prop()
  uploadDate?: Date;

  @Prop({ type: Object, default: {} })
  metadata?: Record<string, any>;
}

export const GridFSFileSchema = SchemaFactory.createForClass(GridFSFile);

export type GridFSChunkDocument = GridFSChunk & Document;
const COLLECTION_NAME_CHUNK = 'fs.chunks';
@Schema({ collection: COLLECTION_NAME_CHUNK })
export class GridFSChunk {
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: GridFSFile.name })
  files_id!: string | mongoose.Schema.Types.ObjectId;

  @Prop()
  n!: number;

  @Prop()
  data!: Buffer;
}

export const GridFSChunkSchema = SchemaFactory.createForClass(GridFSChunk);

export class FileInfo {
  filename?: string;
  type!: string;
  size?: number;
  _id?: mongoose.Schema.Types.ObjectId | string;
  url?: string;
}
