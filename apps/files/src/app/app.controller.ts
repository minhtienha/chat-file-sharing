import {
  Post,
  Get,
  Param,
  Res,
  Controller,
  UseInterceptors,
  UploadedFiles,
  HttpException,
  HttpStatus,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { AppService } from './app.service';
import { GridFSFile, type UserDocument } from '@sharing/models';
import type { Response } from 'express';
import { CurrentUser, JwtAuthGuard } from '@sharing/common';

@Controller('files')
export class AppController {
  constructor(private appService: AppService) {}

  @Post('upload')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FilesInterceptor('file'))
  async upload(
    @CurrentUser() currentUser: UserDocument,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    const ownerId = currentUser?._id;

    return await this.appService.uploadedFiles(files, ownerId);
  }

  @Get('info/:id')
  async getFileInfo(
    @Param('id') id: string,
  ): Promise<{ message: string; file: GridFSFile }> {
    const file = await this.appService.findInfo(id);
    const filestream = await this.appService.readStream(id);
    if (!filestream) {
      throw new HttpException(
        'An error occurred while retrieving file info',
        HttpStatus.EXPECTATION_FAILED,
      );
    }
    return {
      message: 'File has been detected',
      file: file,
    };
  }

  @Get(':id')
  async getFile(@Param('id') id: string, @Res() res: Response) {
    const file = await this.appService.findInfo(id);
    const filestream = await this.appService.readStream(id);
    if (!filestream) {
      throw new HttpException(
        'An error occurred while retrieving file',
        HttpStatus.EXPECTATION_FAILED,
      );
    }
    res.header('Content-Type', file.contentType);
    return filestream.pipe(res);
  }

  @Get('download/:id')
  async downloadFile(@Param('id') id: string, @Res() res: Response) {
    const file = await this.appService.findInfo(id);
    const filestream = await this.appService.readStream(id);
    if (!filestream) {
      throw new HttpException(
        'An error occurred while retrieving file',
        HttpStatus.EXPECTATION_FAILED,
      );
    }
    res.header('Content-Type', file.contentType);
    res.header('Content-Disposition', 'attachment; filename=' + file.filename);
    return filestream.pipe(res);
  }

  @Delete('delete/:id')
  async deleteFile(
    @Param('id') id: string,
  ): Promise<{ message: string; file: GridFSFile }> {
    const file = await this.appService.findInfo(id);
    const filestream = await this.appService.deleteFile(id);
    if (!filestream) {
      throw new HttpException(
        'An error occurred during file deletion',
        HttpStatus.EXPECTATION_FAILED,
      );
    }
    return {
      message: 'File has been deleted',
      file: file,
    };
  }
}
