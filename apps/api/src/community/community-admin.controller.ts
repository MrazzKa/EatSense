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
}
