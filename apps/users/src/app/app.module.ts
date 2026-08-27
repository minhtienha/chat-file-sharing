import { Module } from '@nestjs/common';
import { APP_PIPE } from '@nestjs/core';
import { MongooseModule } from '@nestjs/mongoose';
import { ZodValidationPipe } from 'nestjs-zod';
import { CommonModule } from '@sharing/common';
import { User, UserSchema } from '@sharing/models';
import { AppController } from './app.controller';
import { AppGrpcController } from './app.controller.grpc';
import { AppService } from './app.service';

@Module({
  imports: [
    CommonModule, // trong file common.module.ts
    MongooseModule.forFeature([
      {
        name: User.name,
        schema: UserSchema,
      },
    ]),
  ],
  controllers: [AppController, AppGrpcController],
  providers: [
    AppService,
    {
      provide: APP_PIPE,
      useClass: ZodValidationPipe,
    },
  ],
})
export class AppModule {}
