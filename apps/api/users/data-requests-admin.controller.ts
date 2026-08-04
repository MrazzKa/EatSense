import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Headers,
  Query,
  Logger,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PrismaService } from '../prisma.service';
import { UsersService } from './users.service';

/**
 * The other half of the data-request flow.
 *
 * The app can no longer produce a personal-data export; it only files a request.
 * Someone has to actually answer those, and GDPR Art. 12(3) puts a one-month
 * limit on it — so this is the queue, plus the endpoint that generates the file
 * to send back.
 *
 * Guarded by ADMIN_SECRET, matching the rest of the admin surface. Note this
 * endpoint returns one user's complete personal data by design; that is the
 * whole point, and it is exactly why it is not reachable with a normal user JWT.
 */
@ApiTags('Admin: data requests')
@Controller('admin/data-requests')
export class DataRequestsAdminController {
  private readonly logger = new Logger(DataRequestsAdminController.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
  ) {}

  private validateAdmin(adminSecret: string) {
    const expectedSecret = process.env.ADMIN_SECRET;
    if (!expectedSecret) throw new UnauthorizedException('Invalid admin credentials');
    const a = Buffer.from(String(adminSecret || ''));
    const b = Buffer.from(expectedSecret);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      throw new UnauthorizedException('Invalid admin credentials');
    }
  }

  @Get()
  @ApiOperation({ summary: 'List data-access requests, oldest pending first' })
  async list(@Headers('x-admin-secret') adminSecret: string, @Query('status') status?: string) {
    this.validateAdmin(adminSecret);

    const rows = await this.prisma.dataExportRequest.findMany({
      where: status && status !== 'all' ? { status } : undefined,
      orderBy: [{ status: 'asc' }, { requestedAt: 'asc' }],
      take: 200,
    });

    const now = Date.now();
    return rows.map((r) => {
      const dueBy = new Date(r.requestedAt);
      dueBy.setDate(dueBy.getDate() + 30);
      return {
        ...r,
        dueBy,
        // Surfaced so the queue can show what is running out of time rather than
        // making whoever opens it do date arithmetic.
        daysLeft: r.status === 'pending' ? Math.ceil((dueBy.getTime() - now) / 86400000) : null,
        overdue: r.status === 'pending' && dueBy.getTime() < now,
      };
    });
  }

  @Get(':id/export')
  @ApiOperation({ summary: 'Generate the data export for the requesting user' })
  async generate(@Headers('x-admin-secret') adminSecret: string, @Param('id') id: string) {
    this.validateAdmin(adminSecret);

    const request = await this.prisma.dataExportRequest.findUnique({ where: { id } });
    if (!request) throw new NotFoundException('Request not found');

    const data = await this.usersService.getUserDataExport(request.userId);
    this.logger.log(`[DataRequests] export generated for request=${id} user=${request.userId}`);
    return { request: { id: request.id, email: request.email, requestedAt: request.requestedAt }, data };
  }

  @Post(':id/fulfil')
  @ApiOperation({ summary: 'Mark a request as answered' })
  async fulfil(
    @Headers('x-admin-secret') adminSecret: string,
    @Param('id') id: string,
    @Body() body: { note?: string; status?: 'fulfilled' | 'rejected' },
  ) {
    this.validateAdmin(adminSecret);

    const status = body?.status === 'rejected' ? 'rejected' : 'fulfilled';
    const updated = await this.prisma.dataExportRequest.update({
      where: { id },
      data: { status, fulfilledAt: new Date(), note: body?.note?.slice(0, 2000) || null },
    });
    this.logger.log(`[DataRequests] request=${id} marked ${status}`);
    return updated;
  }
}
