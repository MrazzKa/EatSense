import { Controller, Get, Post, Body, Param, UseGuards, Request } from '@nestjs/common';
import { IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { MessagesService } from './messages.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

class CreateMessageDto {
    @IsOptional()
    @IsIn(['text', 'photo', 'meal_share', 'report_share', 'report_request', 'report_grant', 'report_revoke'])
    type?: 'text' | 'photo' | 'meal_share' | 'report_share' | 'report_request' | 'report_grant' | 'report_revoke';

    @IsString()
    @MinLength(1)
    @MaxLength(4000)
    content: string;

    @IsOptional()
    metadata?: any;
}

class ShareMealsDto {
    @IsString()
    fromDate: string;

    @IsString()
    toDate: string;
}

class ShareReportDto {
    @IsOptional()
    reportData?: any;
}

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
        @Body() body: CreateMessageDto,
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
