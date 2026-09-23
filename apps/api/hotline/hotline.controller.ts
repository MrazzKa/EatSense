import { Body, Controller, Get, Param, Post, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { HotlineService } from './hotline.service';
import { CreateHotlineRequestDto } from './dto';

@ApiTags('Hotline')
@Controller('hotline')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class HotlineController {
  constructor(private readonly hotline: HotlineService) {}

  @Get('status')
  @ApiOperation({
    summary: 'Is the line open, how long is the wait, and does this user already have a request',
  })
  status(@Request() req: any) {
    return this.hotline.statusFor(req.user.id);
  }

  @Post('requests')
  @ApiOperation({ summary: 'Ask to talk to somebody now' })
  create(@Request() req: any, @Body() dto: CreateHotlineRequestDto) {
    return this.hotline.create(req.user.id, dto);
  }

  @Post('requests/:id/cancel')
  cancel(@Request() req: any, @Param('id') id: string) {
    return this.hotline.cancel(req.user.id, id);
  }
}
