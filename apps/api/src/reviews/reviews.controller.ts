import { Controller, Post, Body, Param, UseGuards, Request } from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@Controller('reviews')
@UseGuards(JwtAuthGuard)
export class ReviewsController {
    constructor(private reviewsService: ReviewsService) { }

    @Post('consultation/:consultationId')
    async create(
        @Request() req,
        @Param('consultationId') consultationId: string,
        @Body() body: { rating: number; comment?: string },
    ) {
        return this.reviewsService.create({
            consultationId,
            clientId: req.user.id,
            rating: body.rating,
            comment: body.comment,
        });
    }
}
