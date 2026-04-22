import {
    Controller,
    Get,
    Post,
    Patch,
    Param,
    Body,
    UseGuards,
    Request,
} from '@nestjs/common';
import { IsBoolean, IsIn, IsOptional, IsString } from 'class-validator';
import { ConversationsService } from './conversations.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

class StartConversationDto {
    @IsString()
    expertId: string;

    @IsOptional()
    @IsString()
    offerId?: string;
}

class UpdateConversationDto {
    @IsOptional()
    @IsIn(['active', 'completed', 'cancelled'])
    status?: 'active' | 'completed' | 'cancelled';

    @IsOptional()
    @IsBoolean()
    reportsShared?: boolean;
}

@Controller('conversations')
@UseGuards(JwtAuthGuard)
export class ConversationsController {
    constructor(private conversationsService: ConversationsService) { }

    @Get()
    async findAll(@Request() req: any) {
        return this.conversationsService.findByUserId(req.user.id);
    }

    @Get('unread-count')
    async getUnreadCount(@Request() req: any) {
        return this.conversationsService.getUnreadCount(req.user.id);
    }

    @Get(':id')
    async findById(@Request() req: any, @Param('id') id: string) {
        return this.conversationsService.findById(id, req.user.id);
    }

    @Post('start')
    async start(@Request() req: any, @Body() dto: StartConversationDto) {
        return this.conversationsService.start(req.user.id, dto);
    }

    @Get(':id/client-data')
    async getClientData(@Request() req: any, @Param('id') id: string) {
        return this.conversationsService.getClientData(id, req.user.id);
    }

    @Patch(':id')
    async update(
        @Request() req: any,
        @Param('id') id: string,
        @Body() dto: UpdateConversationDto,
    ) {
        return this.conversationsService.update(id, req.user.id, dto);
    }
}
