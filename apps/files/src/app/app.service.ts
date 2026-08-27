import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import mongoose, { Connection, Model, ObjectId, Types } from 'mongoose';
import { MongoGridFS } from 'mongo-gridfs';
import { GridFSBucketReadStream } from 'mongodb';
import {
  FileUploadDocument,
  FileUploadModel,
  GridFSFile,
} from '@sharing/models';
import * as path from 'path';

@Injectable()
export class AppService {
  private fileModel: MongoGridFS;

  constructor(
    @InjectConnection() private readonly connection: Connection,
    @InjectModel(FileUploadModel.name)
    private readonly fileUploadModel: Model<FileUploadDocument>,
  ) {
    this.fileModel = new MongoGridFS(this.connection.db as any, 'fs');
  }

  async uploadedFiles(
    files: any[],
    ownerId: mongoose.Types.ObjectId,
  ): Promise<FileUploadDocument[]> {
    const docs = files.map((file) => {
      const ext = path
        .extname(file.originalname)
        .replace('.', '')
        .toLowerCase();

      return {
        ownerId: ownerId,
        gridfsFileId: new Types.ObjectId(file.id),
        name: file.originalname,
        extension: ext || undefined,
        contentType: file.mimetype,
        size: file.size,
        source: 'gridfs' as const,
        metadata: file.metadata || {},
      };
    });

    return await this.fileUploadModel.insertMany(docs);
  }

  async readStream(id: string): Promise<GridFSBucketReadStream> {
    return await this.fileModel.readFileStream(id);
  }

  async findInfo(id: string): Promise<GridFSFile> {
    const result = await this.fileModel
      .findById(id)
      .catch((err) => {
        throw new HttpException('Không tìm thấy file', HttpStatus.NOT_FOUND);
      })
      .then((result) => result);
    return {
      filename: result.filename,
      length: result.length,
      chunkSize: result.chunkSize,
      metadata: result.metadata,
      contentType: result.contentType,
      uploadDate: result.uploadDate ?? undefined,
    };
  }

  async deleteFile(id: string): Promise<boolean> {
    return await this.fileModel.delete(id);
  }
}
