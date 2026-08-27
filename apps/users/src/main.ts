/**
 * This is not a production server yet!
 * This is only a minimal backend to get started.
 */

import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { Transport } from '@nestjs/microservices';
import * as fs from 'fs';
import * as path from 'path';
import { AppModule } from './app/app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const globalPrefix = 'api';
  app.setGlobalPrefix(globalPrefix);
  const port = process.env.USERS_PORT || 3001;

  await app.listen(port);
  Logger.log(
    `🚀 Application is running on: http://localhost:${port}/${globalPrefix}`,
  );

  const protoFolder = path.resolve(__dirname, 'protos');
  const filesSync = fs.readdirSync(protoFolder).map((f) => {
    return path.resolve(__dirname, 'protos', f);
  });

  app.connectMicroservice({
    transport: Transport.GRPC,
    options: {
      package: 'users',
      protoPath: filesSync,
      url: '0.0.0.0:' + 5000,
      keepCase: true,
    },
  });
  await app
    .startAllMicroservices()
    .then(() =>
      Logger.log(
        '🚀 Application is connected microservices gRpc on port: ' + 5000,
      ),
    )
    .catch((err) => {
      Logger.error(err);
    });
}

bootstrap();
