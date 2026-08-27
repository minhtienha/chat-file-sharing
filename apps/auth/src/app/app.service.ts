import {
  Inject,
  Injectable,
  Logger,
  OnModuleInit,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import {
  Auth,
  User,
  UserStatus,
  LoginAuthDto,
  RegisterAuthDto,
} from '@sharing/models';
import * as crypto from 'crypto';
import { Model } from 'mongoose';
import type { ClientGrpc } from '@nestjs/microservices';
import {} from '@sharing/models';
import * as bcrypt from 'bcrypt';
import { firstValueFrom } from 'rxjs';
import { UsersService } from '../interface/face.service';

@Injectable()
export class AppService implements OnModuleInit {
  private usersServiceRpc!: UsersService;
  constructor(
    @InjectModel(User.name)
    public usersModel: Model<User>,
    @InjectModel(Auth.name)
    public authModel: Model<Auth>,
    @Inject('USERS_BACKEND')
    private client: ClientGrpc,
    private jwtService: JwtService,
  ) {}

  onModuleInit() {
    this.usersServiceRpc = this.client.getService<UsersService>('UsersService');
  }

  async register(data: RegisterAuthDto) {
    try {
      const registerUser = this.usersServiceRpc.CreateUser(data);
      return await firstValueFrom<User>(registerUser);
    } catch (e: any) {
      Logger.error(e.message ?? e);
      throw new UnauthorizedException('Đăng ký thất bại');
    }
  }

  async login(loginDto: LoginAuthDto) {
    const user = await this.usersModel
      .findOne({
        email: loginDto.email,
      })
      .exec();

    if (!user || !user.status || user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException(
        'Tài khoản không tồn tại hoặc đã bị khóa',
      );
    }

    const isPasswordValid = await bcrypt.compare(
      loginDto.password,
      user.passwordHash,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Email hoặc mật khẩu không đúng');
    }

    return await this.generateTokens(user._id.toString(), user.email);
  }

  private async hashPassword(password: string): Promise<string> {
    return await bcrypt.hash(password, 10);
  }

  private async generateTokens(userId: string, email: string) {
    const payload = { sub: userId, email };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: '15m',
    });

    const refreshToken = crypto.randomBytes(64).toString('hex');
    const refreshTokenHash = this.hashToken(refreshToken);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    await this.authModel.create({
      token: refreshTokenHash,
      user: userId,
      expiresAt,
    });

    return {
      accessToken,
      accessTokenExpires: Math.floor(Date.now() / 1000) + 900,
      refreshToken,
      refreshTokenExpires: Math.floor(Date.now() / 1000) + 2592000,
    };
  }

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }
  async refreshToken(refreshToken: string) {
    const refreshTokenHash = this.hashToken(refreshToken);

    const auth = await this.authModel.findOne({
      token: refreshTokenHash,
    });
    if (!auth || auth.expiresAt < new Date()) {
      throw new UnauthorizedException(
        'Refresh token không hợp lệ hoặc đã hết hạn',
      );
    }

    const user = await this.usersModel.findOne({ _id: auth.user });

    if (!user || user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException(
        'Người dùng không tồn tại hoặc đã bị khóa',
      );
    }

    return this.generateTokens(user.id, user.email);
  }

  async logout(refreshToken: string) {
    const refreshTokenHash = this.hashToken(refreshToken);
    await this.authModel.deleteOne({ token: refreshTokenHash });
    return { message: 'Đăng xuất thành công' };
  }
}
