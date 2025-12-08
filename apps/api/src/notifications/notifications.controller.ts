import { Body, Controller, Delete, Get, Param, Post, Put, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { NotificationsService } from './notifications.service';
import type { RegisterPushTokenDto } from './dto/register-push-token.dto';
import type { SendTestNotificationDto } from './dto/send-test-notification.dto';
import type { UpdateNotificationPreferencesDto } from './dto/update-notification-preferences.dto';

@ApiTags('Notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post('push-token')
  @ApiOperation({ summary: 'Register or update an Expo push token for the authenticated user' })
  registerPushToken(@Request() req: any, @Body() dto: RegisterPushTokenDto) {
    return this.notificationsService.registerPushToken(req.user.id, dto);
  }

  @Get('push-token')
  @ApiOperation({ summary: 'List Expo push tokens registered for the authenticated user' })
  listPushTokens(@Request() req: any) {
    return this.notificationsService.listPushTokens(req.user.id);
  }

  @Delete('push-token/:id')
  @ApiOperation({ summary: 'Remove a specific Expo push token for the authenticated user' })
  deletePushToken(@Request() req: any, @Param('id') id: string) {
    return this.notificationsService.deletePushToken(req.user.id, id);
  }

  @Post('push-token/test')
  @ApiOperation({ summary: 'Send a test push notification to the authenticated user' })
  sendTestNotification(@Request() req: any, @Body() dto: SendTestNotificationDto) {
    return this.notificationsService.sendTestNotification(req.user.id, dto);
  }

  @Get('preferences')
  @ApiOperation({ summary: 'Get notification preferences for the authenticated user' })
  getPreferences(@Request() req: any) {
    return this.notificationsService.getPreferences(req.user.id);
  }

  @Put('preferences')
  @ApiOperation({ summary: 'Update notification preferences for the authenticated user' })
  async updatePreferences(@Request() req: any, @Body() dto: UpdateNotificationPreferencesDto) {
    return this.notificationsService.updatePreferences(req.user.id, dto);
  }
}

