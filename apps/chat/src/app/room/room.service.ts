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
      const existingMemberDocs = await this.chatRoomMemberModel
        .find({
          userId: { $in: memberIdsArray.map((id) => new Types.ObjectId(id)) },
        })
        .exec();

      const roomCounts = new Map<string, number>();
      existingMemberDocs.forEach((doc) => {
        const rId = doc.roomId.toString();
        roomCounts.set(rId, (roomCounts.get(rId) || 0) + 1);
      });

      for (const [roomId, count] of roomCounts.entries()) {
        if (count === 2) {
          const room = await this.chatRoomModel.findById(roomId);
          if (room) {
            await this.chatRoomMemberModel.updateMany(
              {
                roomId: new Types.ObjectId(roomId),
                userId: {
                  $in: memberIdsArray.map((id) => new Types.ObjectId(id)),
                },
              },
              { __isDeleted: false },
            );
            return room;
          }
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
      {
        $match: {
          userId: new Types.ObjectId(userId),
          __isDeleted: false,
        },
      },
      {
        $lookup: {
          from: 'chatrooms',
          localField: 'roomId',
          foreignField: '_id',
          as: 'room',
        },
      },
      { $unwind: '$room' },
    ];

    if (search) {
      pipeline.push({
        $match: {
          'room.name': { $regex: search, $options: 'i' },
        },
      });
    }

    pipeline.push(
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
            $mergeObjects: ['$room', { historyDeletedAt: '$historyDeletedAt' }],
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
