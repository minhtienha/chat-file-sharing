import {
  Controller,
  Get,
  Post,
  Delete,
  Patch,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { MessageService } from './message.service';
import {
  CreateMessageDto,
  QueryMessageDto,
  type UserDocument,
} from '@sharing/models';
import { CurrentUser, JwtAuthGuard } from '@sharing/common';

@Controller('chat-rooms')
@UseGuards(JwtAuthGuard)
export class MessageController {
  constructor(private readonly messageService: MessageService) {}

  @Post(':roomId/messages')
  async sendMessage(
    @CurrentUser() user: UserDocument,
    @Param('roomId') roomId: string,
    @Body() createMessageDto: CreateMessageDto,
  ) {
    const senderId = user._id.toString();
    return this.messageService.sendMessage(roomId, senderId, createMessageDto);
  }

  @Get(':roomId/messages')
  async findMessages(
    @CurrentUser() user: UserDocument,
    @Param('roomId') roomId: string,
    @Query() query: QueryMessageDto,
  ) {
    const userId = user._id.toString();
    return this.messageService.findMessages(roomId, userId, query);
  }

  @Patch(':roomId/read')
  async markAsRead(
    @Param('roomId') roomId: string,
    @CurrentUser() user: UserDocument,
  ) {
    const userId = user._id.toString();
    return this.messageService.markAsRead(roomId, userId);
  }

  @Delete('messages/:messageId')
  async deleteMessage(
    @Param('messageId') messageId: string,
    @CurrentUser() user: UserDocument,
  ) {
    const userId = user._id.toString();
    return this.messageService.deleteMessage(messageId, userId);
  }
}
