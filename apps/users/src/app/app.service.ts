import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { RegisterAuthDto, User } from '@sharing/models';
import * as bcrypt from 'bcrypt';
import { Model } from 'mongoose';

@Injectable()
export class AppService {
  constructor(
    @InjectModel(User.name)
    public usersService: Model<User>,
  ) {}

  async create(data: RegisterAuthDto) {
    const existing = await this.usersService.findOne({
      email: data.email,
    });
    if (existing) {
      throw new HttpException('Email đã được sử dụng', HttpStatus.CONFLICT);
    }

    const hashedPassword = await this.hashPassword(data.password);
    const user = new this.usersService({
      ...data,
      passwordHash: hashedPassword,
    });
    return (await user.save()).toObject();
  }

  private async hashPassword(password: string): Promise<string> {
    return await bcrypt.hash(password, 10);
  }
}
