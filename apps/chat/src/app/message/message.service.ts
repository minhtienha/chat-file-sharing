import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import {
  ChatRoom,
  ChatRoomDocument,
  ChatRoomMember,
  ChatRoomMemberDocument,
  Message,
  MessageDocument,
  CreateMessageDto,
  QueryMessageDto,
} from '@sharing/models';
import { Model, Types } from 'mongoose';
import { ChatGateway } from '../chat-gateway/chat-gateway';

@Injectable()
export class MessageService {
  constructor(
    @InjectModel(Message.name)
    private messageModel: Model<MessageDocument>,
    @InjectModel(ChatRoom.name)
    private chatRoomModel: Model<ChatRoomDocument>,
    @InjectModel(ChatRoomMember.name)
    private chatRoomMemberModel: Model<ChatRoomMemberDocument>,
    private readonly chatGateway: ChatGateway,
  ) {}

  async sendMessage(
    roomId: string,
    senderId: string,
    createMessageDto: CreateMessageDto,
  ): Promise<MessageDocument> {
    const senderInRoom = await this.chatRoomMemberModel.findOne({
      roomId,
      userId: senderId,
    });

    if (!senderInRoom) {
      throw new Error('Người gửi không thuộc phòng chat này');
    }

    const message = await new this.messageModel({
      roomId,
      senderId,
      content: createMessageDto.content,
      type: createMessageDto.type,
    }).save();

    if (message) {
      await this.chatRoomModel.findByIdAndUpdate(roomId, {
        lastMessageId: message._id,
      });
    }

    await this.chatRoomMemberModel.updateMany(
      {
        roomId: new Types.ObjectId(roomId),
        __isDeleted: true,
      },
      { __isDeleted: false },
    );

    const targetRoom = roomId.toString();

    console.log(`[API] Đang emit tin nhắn tới room: ${targetRoom}`);
    this.chatGateway.emitNewMessage(targetRoom, message);

    return message;
  }

  async findMessages(
    roomId: string,
    userId: string,
    query: QueryMessageDto,
  ): Promise<any[]> {
    const roomObjectId = new Types.ObjectId(roomId);
    const userObjectId = new Types.ObjectId(userId);

    const chatMember = await this.chatRoomMemberModel
      .findOne({
        roomId: roomObjectId,
        userId: userObjectId,
      })
      .lean()
      .exec();

    if (!chatMember) {
      throw new ForbiddenException(
        'Bạn không có quyền xem tin nhắn trong phòng này',
      );
    }

    const [page, limit] = [query.page, query.limit];
    const skip = (page - 1) * limit;

    return this.messageModel
      .find({
        roomId: roomObjectId,
        createdAt: { $gt: chatMember.deletedAt || new Date(0) },
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean()
      .exec();
  }

  async deleteMessage(messageId: string, userId: string) {
    const message = await this.messageModel
      .findOne({ _id: messageId, senderId: userId })
      .exec();

    if (!message) {
      throw new ForbiddenException('Bạn không có quyền xóa tin nhắn này');
    }

    await this.messageModel
      .updateOne({ _id: messageId }, { __isDeleted: true })
      .exec();

    return { success: true };
  }

  async markAsRead(roomId: string, userId: string) {
    const roomObjectId = new Types.ObjectId(roomId);
    const userObjectId = new Types.ObjectId(userId);

    const chatMember = await this.chatRoomMemberModel
      .findOne({
        roomId: roomObjectId,
        userId: userObjectId,
      })
      .lean()
      .exec();

    if (!chatMember) {
      throw new ForbiddenException(
        'Bạn không có quyền truy cập phòng chat này',
      );
    }

    await this.chatRoomMemberModel
      .updateOne(
        {
          roomId: roomObjectId,
          userId: userObjectId,
        },
        { lastReadAt: new Date() },
      )
      .exec();

    return { success: true };
  }
}
