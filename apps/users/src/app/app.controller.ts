import { Controller, Get, Query, UseGuards, Patch, Body } from '@nestjs/common';
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

  @Patch('profile')
  async updateProfile(
    @CurrentUser() user: UserDocument,
    @Body() body: { name?: string; avatar?: string; password?: string }
  ) {
    return this.appService.updateProfile(user._id.toString(), body);
  }
}
