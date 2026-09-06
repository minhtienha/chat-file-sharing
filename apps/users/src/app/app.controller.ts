import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { CurrentUser, JwtAuthGuard } from '@sharing/common';
import { User, type UserDocument } from '@sharing/models';
import { AppService } from './app.service';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('me')
  getMe(@CurrentUser() user: User) {
    return user;
  }

  @Get('search')
  async searchUsers(
    @CurrentUser() user: UserDocument,
    @Query('q') query: string,
  ) {
    return this.appService.searchUsers(query, user._id.toString());
  }
}
