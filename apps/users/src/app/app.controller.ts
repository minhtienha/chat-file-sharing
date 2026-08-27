import { Controller, Get, UseGuards } from '@nestjs/common';
import { CurrentUser, JwtAuthGuard } from '@sharing/common';
import { User } from '@sharing/models';
import { AppService } from './app.service';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('me')
  getMe(@CurrentUser() user: User) {
    return user;
  }
}
