import {
  Injectable,
  HttpException,
  HttpStatus,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import mongoose, { Connection, Model, Types } from 'mongoose';
import { MongoGridFS } from 'mongo-gridfs';
import { GridFSBucketReadStream } from 'mongodb';
import {
  FileShareLinkDocument,
  FileShareLinkModel,
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
    @InjectModel(FileShareLinkModel.name)
    private readonly shareLinkModel: Model<FileShareLinkDocument>,
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

  async getMyFiles(ownerId: string | Types.ObjectId) {
    return await this.fileUploadModel
      .find({ ownerId: new Types.ObjectId(ownerId) })
      .sort({ createdAt: -1 })
      .exec();
  }

  async deleteFile(fileId: string, currentUserId: string | Types.ObjectId) {
    const fileDoc = await this.fileUploadModel.findOne({
      gridfsFileId: Types.ObjectId.isValid(fileId)
        ? new Types.ObjectId(fileId)
        : null,
    });

    if (!fileDoc) {
      throw new NotFoundException(
        'Không tìm thấy thông tin file trong hệ thống',
      );
    }

    if (fileDoc.ownerId.toString() !== currentUserId.toString()) {
      throw new ForbiddenException('Bạn không có quyền xóa file này');
    }

    const gridfsId = fileDoc.gridfsFileId.toString();
    try {
      await this.fileModel.delete(gridfsId);
    } catch (err) {}

    await this.fileUploadModel.deleteOne({ _id: fileDoc._id });

    await this.shareLinkModel.deleteMany({ fileId: fileDoc._id });

    return {
      message: 'Xóa file thành công',
      deletedFileId: fileDoc._id,
      fileName: fileDoc.name,
    };
  }
}
