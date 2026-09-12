import {
  Injectable,
  HttpException,
  HttpStatus,
  NotFoundException,
  ForbiddenException,
  OnModuleInit,
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
  Message,
  MessageDocument,
} from '@sharing/models';
import * as path from 'path';

@Injectable()
export class AppService implements OnModuleInit {
  private fileModel: MongoGridFS;

  constructor(
    @InjectConnection() private readonly connection: Connection,
    @InjectModel(FileUploadModel.name)
    private readonly fileUploadModel: Model<FileUploadDocument>,
    @InjectModel(FileShareLinkModel.name)
    private readonly shareLinkModel: Model<FileShareLinkDocument>,
    @InjectModel(Message.name)
    private readonly messageModel: Model<MessageDocument>,
  ) {
    this.fileModel = new MongoGridFS(this.connection.db as any, 'fs');
  }

  // Tự động đồng bộ các file đã gửi trong chat để gắn scope = 'chat'
  async onModuleInit() {
    try {
      const chatMessages = await this.messageModel
        .find({ 'attachments.0': { $exists: true } }, { attachments: 1 })
        .lean()
        .exec();

      const chatGridfsIds: Types.ObjectId[] = [];
      chatMessages.forEach((msg: any) => {
        if (Array.isArray(msg.attachments)) {
          msg.attachments.forEach((att: any) => {
            const id = att.gridfsFileId || att.fileId;
            if (id && Types.ObjectId.isValid(id)) {
              chatGridfsIds.push(new Types.ObjectId(id));
            }
          });
        }
      });

      if (chatGridfsIds.length > 0) {
        await this.fileUploadModel.updateMany(
          { gridfsFileId: { $in: chatGridfsIds }, scope: { $ne: 'chat' } },
          { $set: { scope: 'chat' } },
        );
      }
    } catch (e) {
      console.warn('Không thể tự động đồng bộ scope file chat cũ:', e);
    }
  }

  async uploadedFiles(
    files: any[],
    ownerId: mongoose.Types.ObjectId,
    scope: 'drive' | 'chat' | 'avatar' = 'drive',
  ): Promise<FileUploadDocument[]> {
    const validScope = ['drive', 'chat', 'avatar'].includes(scope) ? scope : 'drive';

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
        scope: validScope,
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
    const fileUpload = await this.fileUploadModel.findOne({
      gridfsFileId: new Types.ObjectId(id),
    });
    return {
      filename: fileUpload?.name || result.filename,
      length: fileUpload?.size || result.length,
      chunkSize: result.chunkSize,
      metadata: result.metadata,
      contentType: fileUpload?.contentType || result.contentType,
      uploadDate: result.uploadDate ?? undefined,
    };
  }

  async getMyFiles(ownerId: string | Types.ObjectId, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const pipeline: any[] = [
      {
        $match: {
          ownerId: new Types.ObjectId(ownerId),
          // Chỉ hiển thị file trong Drive của tôi, tuyệt đối KHÔNG hiển thị file gửi qua chat hoặc ảnh avatar
          scope: { $nin: ['chat', 'avatar'] },
        },
      },
      {
        $lookup: {
          from: 'file_share_links',
          let: { fileId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$fileId', '$$fileId'] },
                    { $eq: ['$isActive', true] },
                    { $gt: ['$expiryDate', new Date()] },
                  ],
                },
              },
            },
          ],
          as: 'activeShares',
        },
      },
      {
        $addFields: {
          isShared: { $gt: [{ $size: '$activeShares' }, 0] },
        },
      },
      { $project: { activeShares: 0 } },
      { $sort: { createdAt: -1 } },
    ];

    const [result] = await this.fileUploadModel.aggregate([
      ...pipeline,
      {
        $facet: {
          data: [{ $skip: skip }, { $limit: Number(limit) }],
          totalCount: [{ $count: 'count' }],
        },
      },
    ]);

    const total = result.totalCount[0]?.count || 0;
    return {
      data: result.data,
      meta: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
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
    } catch (err) {
      throw new HttpException(
        'Không thể xóa file trong GridFS',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    await this.fileUploadModel.deleteOne({ _id: fileDoc._id });

    await this.shareLinkModel.deleteMany({ fileId: fileDoc._id });

    return {
      message: 'Xóa file thành công',
      deletedFileId: fileDoc._id,
      fileName: fileDoc.name,
    };
  }
}
