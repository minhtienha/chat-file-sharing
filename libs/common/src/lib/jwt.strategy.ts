import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { PassportStrategy } from '@nestjs/passport';
import { User, UserStatus } from '@sharing/models';
import { Model } from 'mongoose';
import { ExtractJwt, Strategy } from 'passport-jwt';

interface JwtPayload {
  sub: string;
  email: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    @InjectModel(User.name)
    private usersService: Model<User>,
  ) {
    const secret = configService.get<string>('JWT_SECRET');
    if (!secret) {
      throw new Error('JWT_SECRET không được cấu hình trong biến môi trường');
    }
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.usersService
      .findById(payload.sub)
      .select('-passwordHash')
      .exec();
    if (!user || !user.status || user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException({
        code: 'USER_INACTIVE',
        message: 'Người dùng không tồn tại hoặc đã bị vô hiệu hóa',
      });
    }
    return user.toObject();
  }
}
