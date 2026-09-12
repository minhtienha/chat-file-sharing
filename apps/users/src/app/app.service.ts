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

  async searchUsers(query: string, currentUserId: string) {
    const regex = new RegExp(query, 'i');
    const users = await this.usersService
      .find({
        $and: [
          { _id: { $ne: currentUserId } },
          {
            $or: [{ name: regex }, { email: regex }],
          },
        ],
      })
      .select('-passwordHash')
      .exec();
    return users;
  }

  async updateProfile(userId: string, data: { name?: string; avatar?: string; password?: string }) {
    const updateData: any = {};
    if (data.name) updateData.name = data.name;
    if (data.avatar) updateData.avatar = data.avatar;
    if (data.password) {
      updateData.passwordHash = await this.hashPassword(data.password);
    }
    
    return await this.usersService.findByIdAndUpdate(userId, updateData, { new: true }).select('-passwordHash').exec();
  }
}
