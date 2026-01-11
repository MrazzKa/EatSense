import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@Controller('reviews')
@UseGuards(JwtAuthGuard)
export class ReviewsController {
    constructor(private reviewsService: ReviewsService) { }

    @Get('expert/:expertId')
    async findByExpert(@Param('expertId') expertId: string) {
        return this.reviewsService.findByExpertId(expertId);
    }

    @Post()
    async create(
        @Request() req: any,
        @Body() body: { expertId: string; rating: number; comment?: string; conversationId?: string },
    ) {
        return this.reviewsService.create({
            expertId: body.expertId,
            clientId: req.user.id,
            rating: body.rating,
            comment: body.comment,
            conversationId: body.conversationId,
        });
    }

    @Patch(':id')
    async update(
        @Request() req: any,
        @Param('id') id: string,
        @Body() body: { rating?: number; comment?: string },
    ) {
        return this.reviewsService.update(id, req.user.id, body);
    }

    @Delete(':id')
    async delete(@Request() req: any, @Param('id') id: string) {
        return this.reviewsService.delete(id, req.user.id);
    }
}
