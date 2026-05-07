import {
  Controller,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Headers,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { CommunityService } from './community.service';

@ApiTags('Community Admin')
@Controller('community/admin')
export class CommunityAdminController {
  constructor(private readonly communityService: CommunityService) {}

  private validateAdmin(adminSecret: string) {
    const expectedSecret = process.env.ADMIN_SECRET;
    if (!expectedSecret || adminSecret !== expectedSecret) {
      throw new UnauthorizedException('Invalid admin credentials');
    }
  }

  @Get('reports')
  @ApiOperation({ summary: 'Admin: list community reports' })
  async getReports(
    @Headers('x-admin-secret') adminSecret: string,
    @Query('status') status?: string,
  ) {
    this.validateAdmin(adminSecret);
    return this.communityService.getReports(status);
  }

  @Patch('reports/:id/resolve')
  @ApiOperation({ summary: 'Admin: resolve a report (optionally delete content)' })
  async resolveReport(
    @Headers('x-admin-secret') adminSecret: string,
    @Param('id') id: string,
    @Body() body: { deleteContent?: boolean },
  ) {
    this.validateAdmin(adminSecret);
    return this.communityService.resolveReport(id, body?.deleteContent ?? false);
  }

  @Patch('reports/:id/dismiss')
  @ApiOperation({ summary: 'Admin: dismiss a report' })
  async dismissReport(
    @Headers('x-admin-secret') adminSecret: string,
    @Param('id') id: string,
  ) {
    this.validateAdmin(adminSecret);
    return this.communityService.dismissReport(id);
  }

  @Delete('posts/:id')
  @ApiOperation({ summary: 'Admin: delete any post' })
  async adminDeletePost(
    @Headers('x-admin-secret') adminSecret: string,
    @Param('id') id: string,
  ) {
    this.validateAdmin(adminSecret);
    return this.communityService.adminDeletePost(id);
  }

  @Delete('comments/:id')
  @ApiOperation({ summary: 'Admin: delete any comment' })
  async adminDeleteComment(
    @Headers('x-admin-secret') adminSecret: string,
    @Param('id') id: string,
  ) {
    this.validateAdmin(adminSecret);
    return this.communityService.adminDeleteComment(id);
  }

  // -------------------- Post moderation queue --------------------

  @Get('pending')
  @ApiOperation({ summary: 'Admin: list pending posts (best-places & general)' })
  async listPendingPosts(
    @Headers('x-admin-secret') adminSecret: string,
    @Query('type') type?: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '50',
  ) {
    this.validateAdmin(adminSecret);
    return this.communityService.listPendingPosts(
      type,
      parseInt(page, 10) || 1,
      parseInt(limit, 10) || 50,
    );
  }

  @Patch('posts/:id/approve')
  @ApiOperation({ summary: 'Admin: approve a pending post' })
  async approvePost(
    @Headers('x-admin-secret') adminSecret: string,
    @Param('id') id: string,
  ) {
    this.validateAdmin(adminSecret);
    return this.communityService.moderatePost(id, 'approve');
  }

  @Patch('posts/:id/reject')
  @ApiOperation({ summary: 'Admin: reject a pending post' })
  async rejectPost(
    @Headers('x-admin-secret') adminSecret: string,
    @Param('id') id: string,
    @Body() body: { reason?: string },
  ) {
    this.validateAdmin(adminSecret);
    return this.communityService.moderatePost(id, 'reject', body?.reason);
  }
}
