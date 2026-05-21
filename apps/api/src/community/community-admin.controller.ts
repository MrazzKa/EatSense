import {
  Controller,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Headers,
  Req,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import type { Request } from 'express';
import * as crypto from 'crypto';
import { CommunityService } from './community.service';
import { PrismaService } from '../../prisma.service';

@ApiTags('Community Admin')
@Controller('community/admin')
export class CommunityAdminController {
  private readonly logger = new Logger(CommunityAdminController.name);
  constructor(
    private readonly communityService: CommunityService,
    private readonly prisma: PrismaService,
  ) {}

  private async writeAudit(action: string, targetType: string, targetId: string | null, payload: Record<string, any> | null, req?: Request) {
    try {
      await this.prisma.adminAuditLog.create({
        data: {
          action,
          targetType,
          targetId: targetId ?? undefined,
          payload: payload ?? undefined,
          adminIdentifier: 'env-admin',
          ipAddress: req?.ip ?? req?.headers?.['x-forwarded-for']?.toString() ?? null,
        },
      });
    } catch (err: any) {
      this.logger.warn(`Audit write failed: ${err?.message}`);
    }
  }

  private validateAdmin(adminSecret: string) {
    const expectedSecret = process.env.ADMIN_SECRET;
    if (!expectedSecret) throw new UnauthorizedException('Invalid admin credentials');
    const a = Buffer.from(String(adminSecret || ''));
    const b = Buffer.from(expectedSecret);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
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
    @Req() req: Request,
  ) {
    this.validateAdmin(adminSecret);
    const result = await this.communityService.resolveReport(id, body?.deleteContent ?? false);
    await this.writeAudit('resolve_report', 'community_report', id, { deleteContent: body?.deleteContent ?? false }, req);
    return result;
  }

  @Patch('reports/:id/dismiss')
  @ApiOperation({ summary: 'Admin: dismiss a report' })
  async dismissReport(
    @Headers('x-admin-secret') adminSecret: string,
    @Param('id') id: string,
    @Req() req: Request,
  ) {
    this.validateAdmin(adminSecret);
    const result = await this.communityService.dismissReport(id);
    await this.writeAudit('dismiss_report', 'community_report', id, null, req);
    return result;
  }

  @Delete('posts/:id')
  @ApiOperation({ summary: 'Admin: delete any post' })
  async adminDeletePost(
    @Headers('x-admin-secret') adminSecret: string,
    @Param('id') id: string,
    @Req() req: Request,
  ) {
    this.validateAdmin(adminSecret);
    const result = await this.communityService.adminDeletePost(id);
    await this.writeAudit('delete_community_post', 'community_post', id, null, req);
    return result;
  }

  @Delete('comments/:id')
  @ApiOperation({ summary: 'Admin: delete any comment' })
  async adminDeleteComment(
    @Headers('x-admin-secret') adminSecret: string,
    @Param('id') id: string,
    @Req() req: Request,
  ) {
    this.validateAdmin(adminSecret);
    const result = await this.communityService.adminDeleteComment(id);
    await this.writeAudit('delete_community_comment', 'community_comment', id, null, req);
    return result;
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
    @Req() req: Request,
  ) {
    this.validateAdmin(adminSecret);
    const result = await this.communityService.moderatePost(id, 'approve');
    await this.writeAudit('approve_post', 'community_post', id, null, req);
    return result;
  }

  @Patch('posts/:id/reject')
  @ApiOperation({ summary: 'Admin: reject a pending post' })
  async rejectPost(
    @Headers('x-admin-secret') adminSecret: string,
    @Param('id') id: string,
    @Body() body: { reason?: string },
    @Req() req: Request,
  ) {
    this.validateAdmin(adminSecret);
    const result = await this.communityService.moderatePost(id, 'reject', body?.reason);
    await this.writeAudit('reject_post', 'community_post', id, { reason: body?.reason ?? null }, req);
    return result;
  }
}
