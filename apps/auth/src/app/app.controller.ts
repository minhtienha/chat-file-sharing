import {
  Body,
  Controller,
  HttpCode,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { LoginAuthDto, RegisterAuthDto } from '@sharing/models';
import { AppService } from './app.service';

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: 30 * 24 * 60 * 60 * 1000,
  path: '/',
};

@Controller('auth')
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Post('register')
  register(@Body() data: RegisterAuthDto) {
    return this.appService.register(data);
  }

  @Post('login')
  @HttpCode(200)
  async login(
    @Body() data: LoginAuthDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { accessToken, refreshToken, accessTokenExpires } =
      await this.appService.login(data);

    res.cookie('refreshToken', refreshToken, COOKIE_OPTIONS);

    return {
      accessToken,
      accessTokenExpires,
    };
  }

  @Post('refresh')
  @HttpCode(200)
  async refreshToken(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const rawRefreshToken = req.cookies?.['refreshToken'];

    if (!rawRefreshToken) {
      throw new UnauthorizedException('Không tìm thấy Refresh Token');
    }

    const {
      accessToken,
      refreshToken: newRefreshToken,
      accessTokenExpires,
    } = await this.appService.refreshToken(rawRefreshToken);

    res.cookie('refreshToken', newRefreshToken, COOKIE_OPTIONS);

    return {
      accessToken,
      accessTokenExpires,
    };
  }

  @Post('logout')
  @HttpCode(200)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const rawRefreshToken = req.cookies?.['refreshToken'];

    if (rawRefreshToken) {
      await this.appService.logout(rawRefreshToken);
    }

    res.clearCookie('refreshToken', {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
    });

    return { message: 'Đăng xuất thành công' };
  }
}
