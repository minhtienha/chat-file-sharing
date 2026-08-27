import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MulterModule } from '@nestjs/platform-express';
import { MongooseModule } from '@nestjs/mongoose';
import { GridFsMulterConfigService } from '@sharing/smc';
import { CommonModule } from '@sharing/common';
import {
  FileUploadModel,
  FileUploadSchema,
  GridFSChunk,
  GridFSChunkSchema,
  GridFSFile,
  GridFSFileSchema,
} from '@sharing/models';

@Module({
  imports: [
    CommonModule,
    MulterModule.registerAsync({
      useClass: GridFsMulterConfigService,
    }),
    MongooseModule.forFeature([
      { name: GridFSFile.name, schema: GridFSFileSchema },
      { name: GridFSChunk.name, schema: GridFSChunkSchema },
      { name: FileUploadModel.name, schema: FileUploadSchema },
    ]),
  ],
  controllers: [AppController],
  providers: [AppService, GridFsMulterConfigService],
})
export class AppModule {}
