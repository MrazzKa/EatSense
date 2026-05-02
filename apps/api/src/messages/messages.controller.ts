import { BadRequestException, Controller, Get, Post, Body, Param, UseGuards, Request } from '@nestjs/common';
import { IsIn, IsISO8601, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { MessagesService } from './messages.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

// Cap meal-share range to prevent unbounded queries against the meals table.
const SHARE_MEALS_MAX_DAYS = 90;

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
    @IsISO8601()
    fromDate: string;

    @IsISO8601()
    toDate: string;
}

class ShareReportDto {
    @IsOptional()
    reportData?: any;
}

@Controller('messages')
@UseGuards(JwtAuthGuard, ThrottlerGuard)
export class MessagesController {
    constructor(private messagesService: MessagesService) { }

    @Get('conversation/:conversationId')
    async findByConversation(
        @Request() req: any,
        @Param('conversationId') conversationId: string,
    ) {
        return this.messagesService.findByConversationId(conversationId, req.user.id);
    }

    // Anti-spam: cap message creation at 30 / minute per authenticated user.
    @Throttle({ default: { limit: 30, ttl: 60000 } })
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
        @Body() body: ShareMealsDto,
    ) {
        const fromDate = new Date(body.fromDate);
        const toDate = new Date(body.toDate);
        if (fromDate.getTime() > toDate.getTime()) {
            throw new BadRequestException('fromDate must be before or equal to toDate');
        }
        const spanDays = (toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24);
        if (spanDays > SHARE_MEALS_MAX_DAYS) {
            throw new BadRequestException(`Date range cannot exceed ${SHARE_MEALS_MAX_DAYS} days`);
        }
        return this.messagesService.shareMeals(
            conversationId,
            req.user.id,
            fromDate,
            toDate,
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
