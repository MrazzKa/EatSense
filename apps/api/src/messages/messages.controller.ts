import { Controller, Get, Post, Body, Param, UseGuards, Request } from '@nestjs/common';
import { MessagesService } from './messages.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@Controller('messages')
@UseGuards(JwtAuthGuard)
export class MessagesController {
    constructor(private messagesService: MessagesService) { }

    @Get('conversation/:conversationId')
    async findByConversation(
        @Request() req: any,
        @Param('conversationId') conversationId: string,
    ) {
        return this.messagesService.findByConversationId(conversationId, req.user.id);
    }

    @Post('conversation/:conversationId')
    async create(
        @Request() req: any,
        @Param('conversationId') conversationId: string,
        @Body() body: { type?: string; content: string; metadata?: any },
    ) {
        return this.messagesService.create({
            conversationId,
            senderId: req.user.id,
            type: body.type || 'text',
            content: body.content,
            metadata: body.metadata,
        });
    }

    @Post('conversation/:conversationId/read')
    async markAsRead(
        @Request() req: any,
        @Param('conversationId') conversationId: string,
    ) {
        return this.messagesService.markAsRead(conversationId, req.user.id);
    }

    @Get('unread-count')
    async getUnreadCount(@Request() req: any) {
        return this.messagesService.getUnreadCount(req.user.id);
    }

    @Post('conversation/:conversationId/share-meals')
    async shareMeals(
        @Request() req: any,
        @Param('conversationId') conversationId: string,
        @Body() body: { fromDate: string; toDate: string },
    ) {
        return this.messagesService.shareMeals(
            conversationId,
            req.user.id,
            new Date(body.fromDate),
            new Date(body.toDate),
        );
    }

    @Post('conversation/:conversationId/share-report')
    async shareReport(
        @Request() req: any,
        @Param('conversationId') conversationId: string,
        @Body() body: { reportData: any },
    ) {
        return this.messagesService.shareReport(conversationId, req.user.id, body.reportData);
    }
}
