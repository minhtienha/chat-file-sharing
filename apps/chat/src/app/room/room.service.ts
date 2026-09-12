import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  ChatRoom,
  ChatRoomDocument,
  ChatRoomMember,
  ChatRoomMemberDocument,
  CreateChatRoomDto,
  GetChatRoomsQueryDto,
  Message,
  MessageDocument,
  User,
  UserDocument,
} from '@sharing/models';

import { ChatGateway } from '../chat-gateway/chat-gateway';

@Injectable()
export class RoomService {
  constructor(
    @InjectModel(ChatRoom.name) private readonly chatRoomModel: Model<ChatRoomDocument>,
    @InjectModel(ChatRoomMember.name) private readonly chatRoomMemberModel: Model<ChatRoomMemberDocument>,
    @InjectModel(Message.name) private readonly messageModel: Model<MessageDocument>,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    private readonly chatGateway: ChatGateway,
  ) {}

  async createRoom(creatorId: string, dto: CreateChatRoomDto): Promise<any> {
    const memberIdsSet = new Set([...dto.memberIds, creatorId]);
    const memberIdsArray = Array.from(memberIdsSet);
    const isDirectChat = memberIdsArray.length === 2;

    let targetRoomId: string | Types.ObjectId;

    if (isDirectChat) {
      const memberObjectIds = memberIdsArray.map((id) => new Types.ObjectId(id));
      const directRooms = await this.chatRoomMemberModel.aggregate([
        {
          $group: {
            _id: '$roomId',
            totalMembers: { $sum: 1 },
            matchedMembers: {
              $sum: { $cond: [{ $in: ['$userId', memberObjectIds] }, 1, 0] },
            },
          },
        },
        { $match: { totalMembers: 2, matchedMembers: 2 } },
      ]);

      if (directRooms.length > 0) {
        targetRoomId = directRooms[0]._id;
        await this.chatRoomMemberModel.updateMany(
          { roomId: targetRoomId, userId: { $in: memberObjectIds } },
          { __isDeleted: false },
        );
        return this.findRoomById(targetRoomId.toString(), creatorId);
      }
    }

    const newRoom = await this.chatRoomModel.create({
      name: dto.name,
      createdBy: new Types.ObjectId(creatorId),
      isGroup: !isDirectChat,
    });

    targetRoomId = newRoom._id;

    const memberDocs = memberIdsArray.map((userId) => ({
      roomId: newRoom._id,
      userId: new Types.ObjectId(userId),
      __isDeleted: false,
    }));

    await this.chatRoomMemberModel.insertMany(memberDocs);
    return this.findRoomById(targetRoomId.toString(), creatorId);
  }

  async findMyRooms(userId: string, query: GetChatRoomsQueryDto): Promise<any[]> {
    const { page = 1, limit = 20, search } = query;
    const skip = (page - 1) * limit;

    const pipeline: any[] = [
      { $match: { userId: new Types.ObjectId(userId), __isDeleted: { $ne: true } } },
      { $lookup: { from: 'chatrooms', localField: 'roomId', foreignField: '_id', as: 'room' } },
      { $unwind: '$room' },
      { $lookup: { from: 'messages', localField: 'room.lastMessageId', foreignField: '_id', as: 'lastMessage' } },
      { $unwind: { path: '$lastMessage', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'users',
          localField: 'lastMessage.senderId',
          foreignField: '_id',
          pipeline: [{ $project: { _id: 1, name: 1, email: 1, avatar: 1 } }],
          as: 'lastMessageSender',
        },
      },
      { $unwind: { path: '$lastMessageSender', preserveNullAndEmptyArrays: true } },
      {
        $addFields: {
          lastMessage: {
            $cond: [
              { $ifNull: ['$lastMessage._id', false] },
              {
                $mergeObjects: [
                  '$lastMessage',
                  {
                    sender: '$lastMessageSender',
                    senderId: { $ifNull: ['$lastMessageSender', '$lastMessage.senderId'] },
                  },
                ],
              },
              null,
            ],
          },
        },
      },
      {
        $lookup: {
          from: 'chatroommembers',
          let: { rId: '$roomId' },
          pipeline: [
            { $match: { $expr: { $and: [{ $eq: ['$roomId', '$$rId'] }, { $ne: ['$__isDeleted', true] }] } } },
            { $lookup: { from: 'users', localField: 'userId', foreignField: '_id', pipeline: [{ $project: { _id: 1, name: 1, email: 1, avatar: 1 } }], as: 'user' } },
            { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
            {
              $project: {
                _id: 1,
                lastReadAt: 1,
                user: {
                  _id: '$user._id',
                  name: '$user.name',
                  email: '$user.email',
                  avatar: '$user.avatar',
                },
                userId: {
                  $ifNull: [
                    {
                      _id: '$user._id',
                      name: '$user.name',
                      email: '$user.email',
                      avatar: '$user.avatar',
                    },
                    '$userId',
                  ],
                },
              },
            },
          ],
          as: 'members',
        },
      },
      {
        $match: {
          $or: [
            { 'lastMessage._id': { $exists: true } },
            { $expr: { $gt: [{ $size: '$members' }, 2] } },
          ],
        },
      },
    ];

    if (search && search.trim()) {
      const searchRegex = { $regex: search.trim(), $options: 'i' };
      pipeline.push({
        $match: {
          $or: [
            { 'room.name': searchRegex },
            { 'members.user.name': searchRegex },
            { 'members.userId.name': searchRegex },
          ],
        },
      });
    }

    pipeline.push(
      {
        $lookup: {
          from: 'messages',
          let: { rId: '$roomId', lastRead: { $ifNull: ['$lastReadAt', new Date(0)] } },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$roomId', '$$rId'] },
                    { $gt: ['$createdAt', '$$lastRead'] },
                    { $ne: ['$senderId', new Types.ObjectId(userId)] },
                    { $ne: ['$__isDeleted', true] },
                  ],
                },
              },
            },
            { $count: 'count' },
          ],
          as: 'unreadInfo',
        },
      },
      { $sort: { 'lastMessage.createdAt': -1, 'room.createdAt': -1 } },
      { $skip: skip },
      { $limit: Number(limit) },
      {
        $replaceRoot: {
          newRoot: {
            $mergeObjects: [
              '$room',
              {
                historyDeletedAt: '$historyDeletedAt',
                lastReadAt: '$lastReadAt',
                unreadCount: { $ifNull: [{ $arrayElemAt: ['$unreadInfo.count', 0] }, 0] },
                lastMessage: '$lastMessage',
                members: '$members',
              },
            ],
          },
        },
      },
    );

    return this.chatRoomMemberModel.aggregate(pipeline).exec();
  }

  async findRoomById(roomId: string, userId: string): Promise<any> {
    const chatMember = await this.chatRoomMemberModel.findOne({
      roomId: new Types.ObjectId(roomId),
      userId: new Types.ObjectId(userId),
      __isDeleted: { $ne: true },
    }).exec();

    if (!chatMember) {
      throw new ForbiddenException('Bạn không có quyền truy cập phòng này hoặc phòng không tồn tại');
    }

    const room = await this.chatRoomModel.findById(roomId).lean().exec();
    if (!room) {
      throw new NotFoundException('Room not found');
    }

    // Populate members chi tiết gồm avatar cho cả user và userId
    const members = await this.chatRoomMemberModel.aggregate([
      { $match: { roomId: new Types.ObjectId(roomId), __isDeleted: { $ne: true } } },
      { $lookup: { from: 'users', localField: 'userId', foreignField: '_id', as: 'user' } },
      { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 1,
          lastReadAt: 1,
          user: {
            _id: '$user._id',
            name: '$user.name',
            email: '$user.email',
            avatar: '$user.avatar',
          },
          userId: {
            $ifNull: [
              {
                _id: '$user._id',
                name: '$user.name',
                email: '$user.email',
                avatar: '$user.avatar',
              },
              '$userId',
            ],
          },
        },
      },
    ]);

    // Populate lastMessage chi tiết
    let lastMessage: any = null;
    if (room.lastMessageId) {
      const msg = await this.messageModel.findById(room.lastMessageId).lean().exec();
      if (msg) {
        const sender = await this.userModel.findById(msg.senderId).select('_id name email avatar').lean().exec();
        lastMessage = {
          ...msg,
          sender: sender ?? null,
          senderId: sender ?? msg.senderId,
        };
      }
    }

    return { ...room, members, lastMessage };
  }

  async updateRoom(roomId: string, userId: string, name: string): Promise<ChatRoomDocument> {
    await this.findRoomById(roomId, userId);
    const updatedRoom = await this.chatRoomModel.findByIdAndUpdate(roomId, { name: name }, { new: true }).exec();
    if (!updatedRoom) throw new NotFoundException('Room not found');
    return updatedRoom;
  }

  // User tự rời khỏi phòng / Xóa cuộc trò chuyện 1-1 (Ẩn một phía)
  async deleteRoom(roomId: string, userId: string) {
    const chatMember = await this.chatRoomMemberModel.findOne({
      roomId: new Types.ObjectId(roomId),
      userId: new Types.ObjectId(userId),
    }).exec();

    if (!chatMember) throw new NotFoundException('Room not found in your list');

    await this.chatRoomMemberModel.updateOne(
      { roomId: new Types.ObjectId(roomId), userId: new Types.ObjectId(userId) },
      { __isDeleted: true, deletedAt: new Date() },
    ).exec();

    // TUYỆT ĐỐI KHÔNG emit socket roomDeleted đến toàn bộ phòng khiến B bị văng ra!
    // CHỈ emit tới riêng cá nhân user A để cập nhật UI của A
    this.chatGateway.server.to(userId.toString()).emit('roomDeleted', {
      roomId: roomId.toString(),
      userId: userId.toString(),
    });

    return { success: true };
  }

  // MỚI: Thêm thành viên vào phòng
  async addMembers(roomId: string, memberIds: string[], userId: string) {
    const chatMember = await this.chatRoomMemberModel.findOne({
      roomId: new Types.ObjectId(roomId),
      userId: new Types.ObjectId(userId),
      __isDeleted: false,
    }).exec();

    if (!chatMember) throw new ForbiddenException('Bạn không có quyền thêm thành viên');

    const roomObjectId = new Types.ObjectId(roomId);
    
    // Find existing to avoid duplicates
    const existing = await this.chatRoomMemberModel.find({ 
      roomId: roomObjectId, 
      userId: { $in: memberIds.map(id => new Types.ObjectId(id)) } 
    });
    
    const existingIds = existing.map(e => e.userId.toString());
    const newMembers = memberIds
      .filter(id => !existingIds.includes(id))
      .map(id => ({ roomId: roomObjectId, userId: new Types.ObjectId(id), __isDeleted: false }));

    if (newMembers.length > 0) {
      await this.chatRoomMemberModel.insertMany(newMembers);
    }
    
    // Nếu phòng có >= 3 người, đánh dấu là Group Chat
    const totalMembers = await this.chatRoomMemberModel.countDocuments({ roomId: roomObjectId, __isDeleted: { $ne: true } });
    if (totalMembers > 2) {
      const room = await this.chatRoomModel.findById(roomId);
      if (!room.isGroup) {
        await this.chatRoomModel.findByIdAndUpdate(roomId, { isGroup: true, name: room.name || 'Group Chat' });
      }
    }

    return { success: true };
  }

  // MỚI: Chủ phòng xóa hẳn nhóm
  async deleteRoomEntirely(roomId: string, userId: string) {
    const room = await this.chatRoomModel.findById(roomId);
    if (!room) throw new NotFoundException('Room not found');
    
    if (room.createdBy?.toString() !== userId) {
      throw new ForbiddenException('Chỉ chủ phòng mới được xóa nhóm');
    }

    // Đánh dấu xóa room và toàn bộ member
    await this.chatRoomModel.findByIdAndUpdate(roomId, { __isDeleted: true, deletedAt: new Date() });
    await this.chatRoomMemberModel.updateMany(
      { roomId: new Types.ObjectId(roomId) },
      { __isDeleted: true, deletedAt: new Date() }
    );

    // Giải tán toàn bộ nhóm: Báo cho toàn bộ thành viên trong phòng
    this.chatGateway.server.to(roomId.toString()).emit('roomDeleted', {
      roomId: roomId.toString(),
      entirely: true,
    });

    return { success: true };
  }
}
