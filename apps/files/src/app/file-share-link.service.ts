import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { randomBytes } from 'crypto';
import {
  FileShareLinkModel,
  FileShareLinkDocument,
  FileUploadModel,
  FileUploadDocument,
} from '@sharing/models';

@Injectable()
export class FileShareLinkService {
  constructor(
    @InjectModel(FileShareLinkModel.name)
    private readonly shareLinkModel: Model<FileShareLinkDocument>,
    @InjectModel(FileUploadModel.name)
    private readonly fileUploadModel: Model<FileUploadDocument>,
  ) {}

  async createShareLink(fileId: string, expireInHours: number) {
    const fileExists = await this.fileUploadModel.findById(fileId);

    if (!fileExists) {
      throw new NotFoundException('File không tồn tại');
    }

    const linkToken = randomBytes(24).toString('hex');
    const expiryDate = new Date();
    expiryDate.setHours(expiryDate.getHours() + expireInHours);

    return await this.shareLinkModel.create({
      fileId: new Types.ObjectId(fileId),
      linkToken,
      expiryDate,
      isActive: true,
    });
  }

  async validateToken(token: string) {
    const shareLink = await this.shareLinkModel
      .findOne({ linkToken: token, isActive: true })
      .populate('fileId');

    if (!shareLink) {
      throw new NotFoundException(
        'Liên kết chia sẻ không tồn tại hoặc đã bị vô hiệu',
      );
    }

    if (new Date() > new Date(shareLink.expiryDate)) {
      throw new BadRequestException('Liên kết chia sẻ đã hết hạn');
    }

    return shareLink;
  }

  async updateShareLink(
    token: string,
    currentUserId: string | Types.ObjectId,
    isActive: boolean,
  ) {
    const shareLink = await this.shareLinkModel
      .findOne({ linkToken: token })
      .populate('fileId');

    if (!shareLink) {
      throw new NotFoundException('Liên kết chia sẻ không tồn tại');
    }

    const fileUpload = shareLink.fileId as any;

    if (!fileUpload) {
      throw new NotFoundException('File gốc không còn tồn tại');
    }

    if (fileUpload.ownerId.toString() !== currentUserId.toString()) {
      throw new ForbiddenException('Bạn không có quyền chỉnh sửa liên kết này');
    }

    if (isActive && new Date() > new Date(shareLink.expiryDate)) {
      throw new BadRequestException(
        'Liên kết đã hết hạn thời gian, không thể kích hoạt lại',
      );
    }

    shareLink.isActive = isActive;
    await shareLink.save();

    return {
      message: isActive
        ? 'Kích hoạt lại liên kết chia sẻ thành công'
        : 'Tạm ngưng liên kết chia sẻ thành công',
      linkToken: shareLink.linkToken,
      isActive: shareLink.isActive,
      expiryDate: shareLink.expiryDate,
    };
  }
}
