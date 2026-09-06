import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  ChatRoom,
  ChatRoomDocument,
  ChatRoomMember,
  ChatRoomMemberDocument,
  CreateChatRoomDto,
  GetChatRoomsQueryDto,
} from '@sharing/models';

@Injectable()
export class RoomService {
  constructor(
    @InjectModel(ChatRoom.name)
    private readonly chatRoomModel: Model<ChatRoomDocument>,
    @InjectModel(ChatRoomMember.name)
    private readonly chatRoomMemberModel: Model<ChatRoomMemberDocument>,
  ) {}

  async createRoom(
    creatorId: string,
    dto: CreateChatRoomDto,
  ): Promise<ChatRoomDocument> {
    const memberIdsSet = new Set([...dto.memberIds, creatorId]);
    const memberIdsArray = Array.from(memberIdsSet);
    const isDirectChat = memberIdsArray.length === 2;

    if (isDirectChat) {
      const memberObjectIds = memberIdsArray.map(
        (id) => new Types.ObjectId(id),
      );

      const directRooms = await this.chatRoomMemberModel.aggregate([
        {
          $group: {
            _id: '$roomId',
            totalMembers: { $sum: 1 },
            matchedMembers: {
              $sum: {
                $cond: [{ $in: ['$userId', memberObjectIds] }, 1, 0],
              },
            },
          },
        },
        {
          $match: {
            totalMembers: 2,
            matchedMembers: 2,
          },
        },
      ]);

      if (directRooms.length > 0) {
        const existingRoomId = directRooms[0]._id;
        const room = await this.chatRoomModel.findById(existingRoomId);

        if (room) {
          await this.chatRoomMemberModel.updateMany(
            {
              roomId: existingRoomId,
              userId: { $in: memberObjectIds },
            },
            { __isDeleted: false },
          );
          return room;
        }
      }
    }

    const newRoom = await this.chatRoomModel.create({
      name: dto.name,
      createdBy: new Types.ObjectId(creatorId),
    });

    const memberDocs = memberIdsArray.map((userId) => ({
      roomId: newRoom._id,
      userId: new Types.ObjectId(userId),
      __isDeleted: false,
    }));

    await this.chatRoomMemberModel.insertMany(memberDocs);

    return newRoom;
  }

  async findMyRooms(
    userId: string,
    query: GetChatRoomsQueryDto,
  ): Promise<any[]> {
    const { page = 1, limit = 20, search } = query;
    const skip = (page - 1) * limit;

    const pipeline: any[] = [
      // 1. User hiện tại đang ở trong phòng
      {
        $match: {
          userId: new Types.ObjectId(userId),
          __isDeleted: false,
        },
      },
      // 2. Join thông tin chatroom
      {
        $lookup: {
          from: 'chatrooms',
          localField: 'roomId',
          foreignField: '_id',
          as: 'room',
        },
      },
      { $unwind: '$room' },

      // 3. Join tin nhắn gần nhất
      {
        $lookup: {
          from: 'messages',
          localField: 'room.lastMessageId',
          foreignField: '_id',
          as: 'lastMessage',
        },
      },
      {
        $unwind: {
          path: '$lastMessage',
          preserveNullAndEmptyArrays: true,
        },
      },

      // 4. Join danh sách thành viên
      {
        $lookup: {
          from: 'chatroommembers',
          let: { rId: '$roomId' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$roomId', '$$rId'] },
                    { $eq: ['$__isDeleted', false] },
                  ],
                },
              },
            },
            {
              $lookup: {
                from: 'users',
                localField: 'userId',
                foreignField: '_id',
                pipeline: [
                  {
                    $project: {
                      _id: 1,
                      name: 1,
                    },
                  },
                ],
                as: 'user',
              },
            },
            {
              $unwind: {
                path: '$user',
                preserveNullAndEmptyArrays: true,
              },
            },
          ],
          as: 'members',
        },
      },

      // 5. ĐIỀU KIỆN LỌC PHÒNG RỖNG
      {
        $match: {
          $or: [
            // Điều kiện 1: Đã có tin nhắn
            { 'lastMessage._id': { $exists: true } },

            // Điều kiện 2: Hoặc là phòng nhóm (từ 3 thành viên trở lên)
            { $expr: { $gt: [{ $size: '$members' }, 2] } },
          ],
        },
      },
    ];

    // 6. Tìm kiếm
    if (search && search.trim()) {
      const searchRegex = { $regex: search.trim(), $options: 'i' };
      pipeline.push({
        $match: {
          $or: [
            { 'room.name': searchRegex },
            {
              members: {
                $elemMatch: {
                  userId: { $ne: new Types.ObjectId(userId) },
                  'user.name': searchRegex,
                },
              },
            },
          ],
        },
      });
    }

    // 7. Sắp xếp và phân trang
    pipeline.push(
      {
        $sort: {
          'lastMessage.createdAt': -1,
          'room.createdAt': -1,
        },
      },
      { $skip: skip },
      { $limit: Number(limit) },
      {
        $replaceRoot: {
          newRoot: {
            $mergeObjects: [
              '$room',
              {
                historyDeletedAt: '$historyDeletedAt',
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

  async findRoomById(
    roomId: string,
    userId: string,
  ): Promise<ChatRoomDocument> {
    const chatMember = await this.chatRoomMemberModel
      .findOne({
        roomId: new Types.ObjectId(roomId),
        userId: new Types.ObjectId(userId),
        __isDeleted: false,
      })
      .exec();

    if (!chatMember) {
      throw new ForbiddenException(
        'Bạn không có quyền truy cập phòng này hoặc phòng không tồn tại',
      );
    }

    const room = await this.chatRoomModel.findById(roomId).exec();
    if (!room) {
      throw new NotFoundException('Room not found');
    }

    return room;
  }

  async updateRoom(
    roomId: string,
    userId: string,
    name: string,
  ): Promise<ChatRoomDocument> {
    await this.findRoomById(roomId, userId);

    const updatedRoom = await this.chatRoomModel
      .findByIdAndUpdate(roomId, { name: name }, { new: true })
      .exec();

    if (!updatedRoom) {
      throw new NotFoundException('Room not found');
    }
    return updatedRoom;
  }

  async deleteRoom(roomId: string, userId: string) {
    const chatMember = await this.chatRoomMemberModel
      .findOne({
        roomId: new Types.ObjectId(roomId),
        userId: new Types.ObjectId(userId),
      })
      .exec();

    if (!chatMember) {
      throw new NotFoundException('Room not found in your list');
    }

    await this.chatRoomMemberModel
      .updateOne(
        {
          roomId: new Types.ObjectId(roomId),
          userId: new Types.ObjectId(userId),
        },
        { __isDeleted: true, deletedAt: new Date() },
      )
      .exec();

    return { success: true };
  }
}
