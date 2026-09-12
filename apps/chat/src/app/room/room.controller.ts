import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { RoomService } from './room.service';
import { CurrentUser, JwtAuthGuard } from '@sharing/common';
import {
  CreateChatRoomDto,
  GetChatRoomsQueryDto,
  type UserDocument,
} from '@sharing/models';

@Controller('chat-rooms')
@UseGuards(JwtAuthGuard)
export class RoomController {
  constructor(private readonly roomService: RoomService) {}

  @Post()
  createRoom(
    @CurrentUser() user: UserDocument,
    @Body() data: CreateChatRoomDto,
  ) {
    return this.roomService.createRoom(user._id.toString(), data);
  }

  @Get()
  findMyRooms(
    @CurrentUser() user: UserDocument,
    @Query() query: GetChatRoomsQueryDto,
  ) {
    return this.roomService.findMyRooms(user._id.toString(), query);
  }

  @Get(':roomId')
  findRoomById(
    @Param('roomId') roomId: string,
    @CurrentUser() user: UserDocument,
  ) {
    return this.roomService.findRoomById(roomId, user._id.toString());
  }

  @Patch(':roomId')
  updateRoom(
    @Param('roomId') roomId: string,
    @CurrentUser() user: UserDocument,
    @Body('name') name: string,
  ) {
    return this.roomService.updateRoom(roomId, user._id.toString(), name);
  }

  // Rời khỏi phòng (hoặc xóa lịch sử nhóm 1-1)
  @Delete(':roomId/leave')
  leaveRoom(
    @Param('roomId') roomId: string,
    @CurrentUser() user: UserDocument,
  ) {
    return this.roomService.deleteRoom(roomId, user._id.toString());
  }
  
  // Chủ phòng xóa toàn bộ nhóm
  @Delete(':roomId/entire')
  deleteRoomEntirely(
    @Param('roomId') roomId: string,
    @CurrentUser() user: UserDocument,
  ) {
    return this.roomService.deleteRoomEntirely(roomId, user._id.toString());
  }

  // MỚI: Thêm thành viên vào phòng
  @Post(':roomId/members')
  addMembers(
    @Param('roomId') roomId: string,
    @CurrentUser() user: UserDocument,
    @Body('memberIds') memberIds: string[],
  ) {
    return this.roomService.addMembers(roomId, memberIds || [], user._id.toString());
  }
}
