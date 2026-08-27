import * as fs from 'fs';
import * as path from 'path';
import { Module } from '@nestjs/common';
import { APP_PIPE } from '@nestjs/core';
import { Transport, ClientsModule } from '@nestjs/microservices';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { ZodValidationPipe } from 'nestjs-zod';
import { CommonModule } from '@sharing/common';
import { Auth, AuthSchema, User, UserSchema } from '@sharing/models';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    CommonModule,
    MongooseModule.forFeature([
      {
        name: User.name,
        schema: UserSchema,
      },
      {
        name: Auth.name,
        schema: AuthSchema,
      },
    ]),

    ClientsModule.registerAsync([
      {
        name: 'USERS_BACKEND',
        inject: [ConfigService],
        useFactory: async (configService: ConfigService) => {
          const protoFolder = path.resolve(__dirname, 'protos');
          const filesSync = fs.readdirSync(protoFolder).map((f) => {
            return path.resolve(__dirname, 'protos', f);
          });

          const url = configService.get<string>('USERS_GRPC_URL');
          return {
            transport: Transport.GRPC,
            options: {
              package: 'users',
              protoPath: filesSync,
              url: url,
              keepCase: true,
            },
          };
        },
      },
    ]),
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_PIPE,
      useClass: ZodValidationPipe,
    },
  ],
})
export class AppModule {}
