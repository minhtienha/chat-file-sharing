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

  async sendMessage(roomId: string, senderId: string, createMessageDto: CreateMessageDto): Promise<any> {
    const roomObjectId = new Types.ObjectId(roomId);
    const senderObjectId = new Types.ObjectId(senderId);

    const senderInRoom = await this.chatRoomMemberModel.findOne({
      roomId: roomObjectId,
      userId: senderObjectId,
    });
    if (!senderInRoom) throw new ForbiddenException('Người gửi không thuộc phòng chat này');

    const message = await new this.messageModel({
      roomId: roomObjectId,
      senderId: senderObjectId,
      content: createMessageDto.content || '',
      type: createMessageDto.type || MessageType.TEXT,
      attachments: createMessageDto.attachments || [],
    }).save();

    if (message) {
      await this.chatRoomModel.findByIdAndUpdate(roomObjectId, { lastMessageId: message._id });
    }

    await this.chatRoomMemberModel.updateMany(
      { roomId: roomObjectId, __isDeleted: true },
      { __isDeleted: false },
    );

    // Lấy thông tin sender để gắn vào message trước khi emit qua Socket
    const sender = await this.userModel.findById(senderObjectId).select('_id name email avatar').lean().exec();
    const messageObj = {
      ...message.toObject(),
      sender: sender ?? null,
      senderId: sender ?? message.senderId,
    };

    // Lấy danh sách thành viên trong phòng để emit tới từng người
    const members = await this.chatRoomMemberModel.find({
      roomId: roomObjectId,
      __isDeleted: false,
    }).select('userId').lean().exec();
    const memberIds = members.map((m) => m.userId.toString());

    const targetRoom = roomId.toString();
    this.chatGateway.emitNewMessage(targetRoom, messageObj, memberIds);

    return messageObj;
  }

  async findMessages(roomId: string, userId: string, query: QueryMessageDto) {
    const roomObjectId = new Types.ObjectId(roomId);
    const userObjectId = new Types.ObjectId(userId);

    const chatMember = await this.chatRoomMemberModel.findOne({ roomId: roomObjectId, userId: userObjectId }).lean().exec();
    if (!chatMember) throw new ForbiddenException('Bạn không có quyền xem tin nhắn trong phòng này');

    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Number(query.limit) || 20);
    const skip = (page - 1) * limit;

    const filter = {
      roomId: roomObjectId,
      createdAt: { $gt: chatMember.deletedAt || new Date(0) },
      __isDeleted: { $ne: true } // CHỈNH SỬA: Không lấy tin nhắn đã xóa
    };

    const [messages, total] = await Promise.all([
      this.messageModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean().exec(),
      this.messageModel.countDocuments(filter).exec(),
    ]);

    const senderIds = [...new Set(messages.map((message) => message.senderId.toString()))];
    const users = await this.userModel.find({ _id: { $in: senderIds } }).select('_id name email avatar').lean().exec();
    const userMap = new Map(users.map((user) => [user._id.toString(), user]));

    const messagesWithSender = messages.map((message) => {
      const sender = userMap.get(message.senderId.toString()) ?? null;
      return {
        ...message,
        sender,
        senderId: sender ?? message.senderId,
      };
    });

    return {
      data: messagesWithSender,
      meta: {
        page, limit, total,
        totalPages: Math.ceil(total / limit),
        hasMore: skip + messages.length < total,
      },
    };
  }

  async deleteMessage(messageId: string, userId: string) {
    const message = await this.messageModel.findOne({ _id: messageId, senderId: userId }).exec();
    if (!message) throw new ForbiddenException('Bạn không có quyền xóa tin nhắn này');

    await this.messageModel.updateOne({ _id: messageId }, { __isDeleted: true }).exec();

    // Báo cho frontend qua Socket để xóa khỏi UI realtime
    const members = await this.chatRoomMemberModel.find({
      roomId: message.roomId,
      __isDeleted: false,
    }).select('userId').lean().exec();

    const payload = { messageId, roomId: message.roomId.toString() };
    this.chatGateway.server.to(message.roomId.toString()).emit('messageDeleted', payload);
    members.forEach((m) => {
      this.chatGateway.server.to(m.userId.toString()).emit('messageDeleted', payload);
    });

    return { success: true };
  }

  async markAsRead(roomId: string, userId: string) {
    const roomObjectId = new Types.ObjectId(roomId);
    const userObjectId = new Types.ObjectId(userId);

    const chatMember = await this.chatRoomMemberModel.findOne({ roomId: roomObjectId, userId: userObjectId }).lean().exec();
    if (!chatMember) throw new ForbiddenException('Bạn không có quyền truy cập phòng chat này');

    const now = new Date();
    await this.chatRoomMemberModel.updateOne({ roomId: roomObjectId, userId: userObjectId }, { lastReadAt: now }).exec();

    // Báo cho các client qua socket để cập nhật trạng thái đã đọc và đã xem realtime
    const nowIso = now.toISOString();
    const payload = {
      roomId: roomId.toString(),
      userId: userId.toString(),
      lastReadAt: nowIso,
    };

    this.chatGateway.server.to(roomId.toString()).emit('roomRead', payload);
    this.chatGateway.server.to(roomId.toString()).emit('messagesSeen', {
      roomId: roomId.toString(),
      userId: userId.toString(),
      seenAt: nowIso,
    });

    return { success: true, lastReadAt: nowIso };
  }

  // MỚI: Lấy danh sách attachments (dựa trên chuỗi __has_files__ trong content)
  async getRoomAttachments(roomId: string, userId: string) {
    const roomObjectId = new Types.ObjectId(roomId);
    const userObjectId = new Types.ObjectId(userId);

    const chatMember = await this.chatRoomMemberModel.findOne({ roomId: roomObjectId, userId: userObjectId }).exec();
    if (!chatMember) throw new ForbiddenException('Bạn không có quyền truy cập');

    // Tìm tất cả tin nhắn chứa file
    const messages = await this.messageModel.find({
      roomId: roomObjectId,
      content: { $regex: '^__has_files__' },
      __isDeleted: { $ne: true }
    }).sort({ createdAt: -1 }).lean().exec();

    let attachments = [];
    messages.forEach(msg => {
      try {
         const jsonStr = msg.content.replace('__has_files__', '');
         const parsed = JSON.parse(jsonStr);
         if (parsed.files && parsed.files.length > 0) {
           attachments = attachments.concat(parsed.files.map(f => ({ ...f, messageId: msg._id, createdAt: msg.createdAt })));
         }
      } catch (e) {}
    });

    return attachments;
  }
}
