import { Body, Controller, Delete, Get, Param, Post, Put, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { HotlineService } from './hotline.service';
import { HotlineAvailabilityService } from './hotline-availability.service';
import { HotlineHeartbeatDto, ReplaceHotlineShiftsDto } from './dto';

@ApiTags('Hotline (expert)')
@Controller('hotline/expert')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class HotlineExpertController {
  constructor(
    private readonly hotline: HotlineService,
    private readonly availability: HotlineAvailabilityService,
  ) {}

  @Get('queue')
  @ApiOperation({ summary: 'People waiting, plus the requests this expert has taken' })
  queue(@Request() req: any) {
    return this.hotline.queueFor(req.user.id);
  }

  @Get('queue/:id')
  @ApiOperation({ summary: 'One request with the body-map record attached to it' })
  caseCard(@Request() req: any, @Param('id') id: string) {
    return this.hotline.caseFor(req.user.id, id);
  }

  @Post('queue/:id/accept')
  @ApiOperation({ summary: 'Take a request and open the conversation' })
  accept(@Request() req: any, @Param('id') id: string) {
    return this.hotline.accept(req.user.id, id);
  }

  @Post('queue/:id/complete')
  complete(@Request() req: any, @Param('id') id: string) {
    return this.hotline.complete(req.user.id, id);
  }

  @Get('shifts')
  async shifts(@Request() req: any) {
    const expert = await this.hotline.requireExpert(req.user.id);
    return this.availability.listShifts(expert.id);
  }

  @Put('shifts')
  @ApiOperation({ summary: 'Replace the whole rota' })
  async replaceShifts(@Request() req: any, @Body() dto: ReplaceHotlineShiftsDto) {
    const expert = await this.hotline.requireExpert(req.user.id);
    return this.availability.replaceShifts(expert.id, dto.shifts);
  }

  @Post('presence')
  @ApiOperation({ summary: 'Go on the line, or extend the time already granted' })
  async heartbeat(@Request() req: any, @Body() dto: HotlineHeartbeatDto) {
    const expert = await this.hotline.requireExpert(req.user.id);
    return this.availability.heartbeat(expert.id, dto.minutes ?? 10);
  }

  @Delete('presence')
  async offline(@Request() req: any) {
    const expert = await this.hotline.requireExpert(req.user.id);
    return this.availability.goOffline(expert.id);
  }
}
