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
    @Body() name: string,
  ) {
    return this.roomService.updateRoom(roomId, user._id.toString(), name);
  }

  @Delete(':roomId')
  deleteRoom(
    @Param('roomId') roomId: string,
    @CurrentUser() user: UserDocument,
  ) {
    return this.roomService.deleteRoom(roomId, user._id.toString());
  }
}
