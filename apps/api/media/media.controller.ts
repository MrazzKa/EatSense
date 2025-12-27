import { Controller, Post, Get, Param, UploadedFile, UseInterceptors, UseGuards, Request, Res, NotFoundException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MediaService, UploadResult } from './media.service';
import { Response } from 'express';

@ApiTags('Media')
@Controller('media')
export class MediaController {
  constructor(private readonly mediaService: MediaService) { }

  @Post('upload')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload media file' })
  @ApiResponse({ status: 201, description: 'File uploaded successfully' })
  @ApiConsumes('multipart/form-data')
  async uploadFile(
    @UploadedFile() file: any,
    @Request() req: any,
  ): Promise<UploadResult> {
    return this.mediaService.uploadFile(file, req.user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get media file by ID' })
  @ApiResponse({ status: 200, description: 'Media file content' })
  @ApiResponse({ status: 404, description: 'Media not found' })
  async getMedia(
    @Param('id') id: string,
    @Res() res: Response,
  ): Promise<void> {
    return this.mediaService.serveMedia(id, res);
  }
}
