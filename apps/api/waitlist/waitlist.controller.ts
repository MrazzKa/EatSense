import { Body, Controller, Post, BadRequestException } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { MailerService } from '../mailer/mailer.service';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Public waiting-list signup for the marketing site (eatsense.ch). Used while the
 * Google Play release isn't live yet — visitors leave their email and the team is
 * notified. No auth; rate-limited by the global ThrottlerModule.
 */
@ApiTags('waitlist')
@Controller('waitlist')
export class WaitlistController {
  constructor(private readonly mailer: MailerService) {}

  @Post()
  @ApiOperation({ summary: 'Join the waiting list (emails the team)' })
  @ApiResponse({ status: 201, description: 'Signed up' })
  async join(@Body() body: { email?: string; platform?: string }) {
    const email = (body?.email || '').toString().trim().toLowerCase();
    if (!email || !EMAIL_RE.test(email) || email.length > 200) {
      throw new BadRequestException('A valid email is required.');
    }
    const platform = (body?.platform || 'android').toString().slice(0, 32);
    try {
      await this.mailer.sendEmail({
        to: 'info@eatsense.ch',
        subject: `[EatSense] New waiting-list signup (${platform})`,
        text: `New waiting-list signup\n\nEmail: ${email}\nPlatform: ${platform}\nAt: ${new Date().toISOString()}`,
      });
    } catch {
      // Never fail the visitor if the notification email hiccups.
    }
    return { success: true };
  }
}
