import { Body, Controller, Delete, Get, Header, Param, Patch, Post, Query, Request, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CalendarService } from './calendar.service';

@Controller()
export class CalendarController {
  constructor(private calendar: CalendarService) {}

  @Get('experts/me/availability')
  @UseGuards(JwtAuthGuard)
  async getMyAvailability(@Request() req: any) {
    return this.calendar.getMyAvailability(req.user.id);
  }

  @Post('experts/me/availability')
  @UseGuards(JwtAuthGuard)
  async setMyAvailability(@Request() req: any, @Body() dto: any) {
    return this.calendar.setMyAvailability(req.user.id, dto);
  }

  @Post('experts/me/availability/exceptions')
  @UseGuards(JwtAuthGuard)
  async addException(@Request() req: any, @Body() dto: any) {
    return this.calendar.addException(req.user.id, dto);
  }

  @Delete('experts/me/availability/exceptions/:id')
  @UseGuards(JwtAuthGuard)
  async removeException(@Request() req: any, @Param('id') id: string) {
    return this.calendar.removeException(req.user.id, id);
  }

  @Get('experts/:id/availability/slots')
  @UseGuards(JwtAuthGuard)
  async listSlots(
    @Param('id') id: string,
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('duration') duration: string,
  ) {
    return this.calendar.listSlots(id, {
      from: from ? new Date(from) : new Date(),
      to: to ? new Date(to) : new Date(Date.now() + 14 * 86400000),
      durationMinutes: parseInt(duration || '60', 10),
    });
  }

  @Post('consultations')
  @UseGuards(JwtAuthGuard)
  async create(@Request() req: any, @Body() dto: any) {
    return this.calendar.createConsultation(req.user.id, dto);
  }

  @Get('consultations/me')
  @UseGuards(JwtAuthGuard)
  async listMine(
    @Request() req: any,
    @Query('role') role: any,
    @Query('status') status?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.calendar.listMyConsultations(req.user.id, {
      role,
      status,
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
    });
  }

  @Delete('consultations/:id')
  @UseGuards(JwtAuthGuard)
  async cancel(@Request() req: any, @Param('id') id: string, @Body() body: any) {
    return this.calendar.cancelConsultation(req.user.id, id, body?.reason);
  }

  @Patch('consultations/:id/reschedule')
  @UseGuards(JwtAuthGuard)
  async propose(@Request() req: any, @Param('id') id: string, @Body() dto: any) {
    return this.calendar.proposeReschedule(req.user.id, id, dto);
  }

  @Post('consultations/:id/reschedule/respond')
  @UseGuards(JwtAuthGuard)
  async respond(@Request() req: any, @Param('id') id: string, @Body() body: { accept: boolean }) {
    return this.calendar.respondReschedule(req.user.id, id, !!body.accept);
  }

  @Post('consultations/:id/start')
  @UseGuards(JwtAuthGuard)
  async start(@Request() req: any, @Param('id') id: string) {
    return this.calendar.startConsultation(req.user.id, id);
  }

  @Post('consultations/:id/complete')
  @UseGuards(JwtAuthGuard)
  async complete(@Request() req: any, @Param('id') id: string) {
    return this.calendar.completeConsultation(req.user.id, id);
  }

  // Token-based iCal feed (no JWT — feed URLs are subscribed in calendar apps).
  // Token = HMAC-SHA256(JWT_SECRET, userId) signed in CalendarService.
  @Get('consultations/me/ical.ics')
  @Header('Content-Type', 'text/calendar; charset=utf-8')
  async ical(@Query('token') token: string, @Res() res: Response) {
    const ics = await this.calendar.generateICalForToken(token);
    res.setHeader('Cache-Control', 'no-cache, max-age=0');
    res.setHeader('Content-Disposition', 'inline; filename="eatsense.ics"');
    res.send(ics);
  }

  @Get('consultations/me/ical-token')
  @UseGuards(JwtAuthGuard)
  async icalToken(@Request() req: any) {
    return { token: this.calendar.signICalToken(req.user.id) };
  }
}
