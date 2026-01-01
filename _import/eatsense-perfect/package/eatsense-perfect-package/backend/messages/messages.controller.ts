import { Controller, Get, Post, Body, Param, UseGuards, Request } from '@nestjs/common';
import { MessagesService } from './messages.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('messages')
@UseGuards(JwtAuthGuard)
export class MessagesController {
  constructor(private messagesService: MessagesService) {}

  @Get('consultation/:consultationId')
  async findByConsultation(
    @Request() req,
    @Param('consultationId') consultationId: string,
  ) {
    return this.messagesService.findByConsultationId(consultationId, req.user.id);
  }

  @Post('consultation/:consultationId')
  async create(
    @Request() req,
    @Param('consultationId') consultationId: string,
    @Body() body: { type?: string; content: string; metadata?: any },
  ) {
    return this.messagesService.create({
      consultationId,
      senderId: req.user.id,
      type: body.type || 'text',
      content: body.content,
      metadata: body.metadata,
    });
  }

  @Post('consultation/:consultationId/read')
  async markAsRead(
    @Request() req,
    @Param('consultationId') consultationId: string,
  ) {
    return this.messagesService.markAsRead(consultationId, req.user.id);
  }

  @Get('unread-count')
  async getUnreadCount(@Request() req) {
    const count = await this.messagesService.getUnreadCount(req.user.id);
    return { count };
  }

  @Post('consultation/:consultationId/share-meals')
  async shareMeals(
    @Request() req,
    @Param('consultationId') consultationId: string,
    @Body() body: { fromDate: string; toDate: string },
  ) {
    return this.messagesService.shareMeals({
      consultationId,
      senderId: req.user.id,
      fromDate: new Date(body.fromDate),
      toDate: new Date(body.toDate),
    });
  }

  @Post('consultation/:consultationId/share-lab/:labResultId')
  async shareLabResults(
    @Request() req,
    @Param('consultationId') consultationId: string,
    @Param('labResultId') labResultId: string,
  ) {
    return this.messagesService.shareLabResults({
      consultationId,
      senderId: req.user.id,
      labResultId,
    });
  }
}
