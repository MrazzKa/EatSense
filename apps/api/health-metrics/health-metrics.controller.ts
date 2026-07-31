import { Body, Controller, Get, Post, Query, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { HealthMetricsService } from './health-metrics.service';
import { SyncHealthMetricsDto } from './dto';

@ApiTags('Health Metrics')
@Controller('health-metrics')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class HealthMetricsController {
  constructor(private readonly service: HealthMetricsService) {}

  @Post('sync')
  @ApiOperation({
    summary: 'Push Apple Health / Health Connect daily activity',
    description:
      'The app is the only thing that can read these stores, so it uploads a daily rollup. Upserts by (user, date).',
  })
  async sync(@Request() req: any, @Body() dto: SyncHealthMetricsDto) {
    return this.service.sync(req.user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Read synced daily activity for a date range' })
  async getRange(@Request() req: any, @Query('from') from?: string, @Query('to') to?: string) {
    const today = new Date().toISOString().split('T')[0];
    const defaultFrom = new Date();
    defaultFrom.setDate(defaultFrom.getDate() - 30);
    return this.service.getRange(
      req.user.id,
      from || defaultFrom.toISOString().split('T')[0],
      to || today,
    );
  }
}
