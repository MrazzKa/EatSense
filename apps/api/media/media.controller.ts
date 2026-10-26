import { Controller, Post, Get, Param, UploadedFile, UseInterceptors, UseGuards, Request, Res, Headers, UnauthorizedException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalAuthGuard } from '../auth/guards/optional-auth.guard';
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

  @Post('upload-document')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload image or PDF document (for credentials, etc.)' })
  @ApiResponse({ status: 201, description: 'Document uploaded successfully' })
  @ApiConsumes('multipart/form-data')
  async uploadDocument(
    @UploadedFile() file: any,
    @Request() req: any,
  ): Promise<UploadResult> {
    return this.mediaService.uploadDocument(file, req.user.id);
  }

  @Get('credential/:id')
  @UseGuards(OptionalAuthGuard)
  @ApiOperation({ summary: 'Get credential file (owner or admin only)' })
  @ApiResponse({ status: 200, description: 'Credential file content' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async getCredential(
    @Param('id') id: string,
    @Request() req: any,
    @Headers('x-admin-secret') adminSecret: string | undefined,
    @Res() res: Response,
  ): Promise<void> {
    const expectedAdminSecret = process.env.ADMIN_SECRET;
    const isAdmin = !!expectedAdminSecret && adminSecret === expectedAdminSecret;
    const requesterUserId: string | null = req.user?.id || null;

    if (!requesterUserId && !isAdmin) {
      throw new UnauthorizedException('Authentication required');
    }

    return this.mediaService.serveCredential(id, requesterUserId, isAdmin, res);
  }

  /**
   * Intentionally unauthenticated: shipped clients load these URLs directly
   * (RN `<Image>`, the native ImagePipeline, chat/community photos shown to
   * other users) without an Authorization header. Access control is the id
   * itself — a Prisma `cuid()`, not sequential and not enumerable over HTTP —
   * i.e. "anyone with the link". Only images are served here; documents
   * (PDF credentials, lab reports) go through `credential/:id` with an
   * owner/admin check. Moving to signed, expiring URLs would remove the
   * link-sharing tradeoff but needs client changes.
   */
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
