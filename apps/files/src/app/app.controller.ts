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
  Body,
  Patch,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { AppService } from './app.service';
import { GridFSFile, type UserDocument } from '@sharing/models';
import type { Response } from 'express';
import { CurrentUser, JwtAuthGuard } from '@sharing/common';
import { FileShareLinkService } from './file-share-link.service';
import { UrlMappingInterceptor } from './url-mapping.interceptor';

@Controller('files')
export class AppController {
  constructor(
    private appService: AppService,
    private readonly shareLinkService: FileShareLinkService,
  ) {}

  @Post('')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FilesInterceptor('file'))
  async upload(
    @CurrentUser() currentUser: UserDocument,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    const ownerId = currentUser?._id;

    return await this.appService.uploadedFiles(files, ownerId);
  }

  @Get('my-files')
  @UseGuards(JwtAuthGuard)
  async getMyFiles(@CurrentUser() currentUser: UserDocument) {
    return await this.appService.getMyFiles(currentUser._id);
  }

  @Patch('shared/:token')
  @UseGuards(JwtAuthGuard)
  async updateShareLink(
    @CurrentUser() currentUser: UserDocument,
    @Param('token') token: string,
    @Body() body: { isActive: boolean },
  ) {
    return await this.shareLinkService.updateShareLink(
      token,
      currentUser._id,
      body.isActive,
    );
  }

  @Post(':id/share')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(UrlMappingInterceptor)
  async createShareLink(
    @Param('id') fileId: string,
    @Body() body: { expireInHours: number },
  ) {
    const { expireInHours } = body;
    return await this.shareLinkService.createShareLink(fileId, expireInHours);
  }

  @Get('shared/:token')
  async getSharedFile(@Param('token') token: string, @Res() res: Response) {
    const shareLink = await this.shareLinkService.validateToken(token);
    const fileUpload = shareLink.fileId as any;

    if (!fileUpload) {
      throw new HttpException(
        'File gốc không còn tồn tại',
        HttpStatus.NOT_FOUND,
      );
    }

    const gridfsId = fileUpload.gridfsFileId.toString();
    const filestream = await this.appService.readStream(gridfsId);

    if (!filestream) {
      throw new HttpException(
        'Không thể tải file',
        HttpStatus.EXPECTATION_FAILED,
      );
    }

    res.header(
      'Content-Type',
      fileUpload.contentType || 'application/octet-stream',
    );
    res.header(
      'Content-Disposition',
      `inline; filename="${encodeURIComponent(fileUpload.name)}"`,
    );

    return filestream.pipe(res);
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

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async deleteFile(
    @CurrentUser() currentUser: UserDocument,
    @Param('id') id: string,
  ) {
    return await this.appService.deleteFile(id, currentUser._id);
  }
}
