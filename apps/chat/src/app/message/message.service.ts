import { ForbiddenException, Injectable } from '@nestjs/common';
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
  User,
  UserDocument,
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
    @InjectModel(User.name)
    private userModel: Model<UserDocument>,
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
  ): Promise<{
    data: any[];
    meta: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasMore: boolean;
    };
  }> {
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

    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Number(query.limit) || 20);
    const skip = (page - 1) * limit;

    const filter = {
      roomId: roomObjectId,
      createdAt: { $gt: chatMember.deletedAt || new Date(0) },
    };

    const [messages, total] = await Promise.all([
      this.messageModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      this.messageModel.countDocuments(filter).exec(),
    ]);

    const senderIds = [
      ...new Set(messages.map((message) => message.senderId.toString())),
    ];

    const users = await this.userModel
      .find({
        _id: { $in: senderIds },
      })
      .select('_id name')
      .lean()
      .exec();

    const userMap = new Map(users.map((user) => [user._id.toString(), user]));

    const messagesWithSender = messages.map((message) => ({
      ...message,
      sender: userMap.get(message.senderId.toString()) ?? null,
    }));

    const totalPages = Math.ceil(total / limit);
    const hasMore = skip + messages.length < total;

    return {
      data: messagesWithSender,
      meta: {
        page,
        limit,
        total,
        totalPages,
        hasMore,
      },
    };
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
