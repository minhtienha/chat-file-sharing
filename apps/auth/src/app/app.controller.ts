import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import {
  LoginAuthDto,
  RegisterAuthDto,
  RefreshTokenDto,
} from '@sharing/models';
import { AppService } from './app.service';

@Controller('auth')
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Post('register')
  register(@Body() data: RegisterAuthDto) {
    return this.appService.register(data);
  }

  @Post('login')
  @HttpCode(200)
  login(@Body() data: LoginAuthDto) {
    return this.appService.login(data);
  }

  @Post('/refresh-token')
  refreshToken(@Body() data: RefreshTokenDto) {
    return this.appService.refreshToken(data.refreshToken);
  }

  @Post('/logout')
  logout(@Body() data: RefreshTokenDto) {
    return this.appService.logout(data.refreshToken);
  }
}
