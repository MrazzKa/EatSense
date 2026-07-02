import { Body, Controller, Get, Post, Query, BadRequestException } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CommunityService } from './community.service';
import { MailerService } from '../../mailer/mailer.service';

/**
 * Public (no-auth) community endpoints for the marketing site (eatsense.ch):
 * a read-only map of approved "best places" and a "suggest a place" form that
 * notifies the team for moderation. Rate-limited by the global ThrottlerModule.
 */
@ApiTags('community-public')
@Controller('community/public')
export class CommunityPublicController {
  constructor(
    private readonly communityService: CommunityService,
    private readonly mailer: MailerService,
  ) {}

  @Get('best-places')
  @ApiOperation({ summary: 'Public: approved best-places with coordinates (no auth)' })
  async bestPlaces(@Query('limit') limit?: string) {
    const n = Math.min(parseInt(limit || '200', 10) || 200, 500);
    const data = await this.communityService.getPublicBestPlaces(n);
    return { data, total: data.length };
  }

  @Post('suggest-place')
  @ApiOperation({ summary: 'Public: suggest a place (emails the team for moderation)' })
  async suggestPlace(
    @Body()
    body: {
      placeName?: string;
      city?: string;
      note?: string;
      latitude?: number;
      longitude?: number;
      email?: string;
    },
  ) {
    const placeName = (body?.placeName || '').toString().trim();
    if (!placeName || placeName.length > 120) {
      throw new BadRequestException('A place name is required.');
    }
    const city = (body?.city || '').toString().trim().slice(0, 80);
    const note = (body?.note || '').toString().trim().slice(0, 600);
    const email = (body?.email || '').toString().trim().slice(0, 200);
    const lat = Number(body?.latitude);
    const lng = Number(body?.longitude);
    const hasCoords = Number.isFinite(lat) && Number.isFinite(lng);

    try {
      await this.mailer.sendEmail({
        to: 'info@eatsense.ch',
        subject: `[EatSense] New place suggestion: ${placeName}`,
        text: [
          'New place suggestion from the website map',
          '',
          `Place: ${placeName}`,
          `City: ${city || '-'}`,
          `Coordinates: ${hasCoords ? `${lat}, ${lng}` : '-'}`,
          `Map: ${hasCoords ? `https://www.google.com/maps?q=${lat},${lng}` : '(no pin)'}`,
          `Note: ${note || '-'}`,
          `Submitted by: ${email || 'anonymous'}`,
          `At: ${new Date().toISOString()}`,
        ].join('\n'),
      });
    } catch {
      // Never fail the visitor if the notification email hiccups.
    }
    return { success: true };
  }

  @Post('ambassador-apply')
  @ApiOperation({ summary: 'Public: ambassador application (emails the team)' })
  async ambassadorApply(
    @Body() body: { name?: string; email?: string; social?: string; message?: string },
  ) {
    const name = (body?.name || '').toString().trim();
    const email = (body?.email || '').toString().trim();
    if (!name || name.length > 120 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 200) {
      throw new BadRequestException('A name and a valid email are required.');
    }
    const social = (body?.social || '').toString().trim().slice(0, 200);
    const message = (body?.message || '').toString().trim().slice(0, 1000);
    try {
      await this.mailer.sendEmail({
        to: 'info@eatsense.ch',
        subject: `[EatSense] New ambassador application: ${name}`,
        text: [
          'New ambassador application from the website',
          '',
          `Name: ${name}`,
          `Email: ${email}`,
          `Social/site: ${social || '-'}`,
          `Message: ${message || '-'}`,
          `At: ${new Date().toISOString()}`,
        ].join('\n'),
      });
    } catch {
      // Never fail the visitor if the notification email hiccups.
    }
    return { success: true };
  }
}
