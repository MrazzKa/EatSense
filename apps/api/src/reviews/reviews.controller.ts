import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { ReviewsService } from './reviews.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

class CreateReviewBody {
    @IsString()
    expertId: string;

    @IsString()
    conversationId: string;

    @IsInt()
    @Min(1)
    @Max(5)
    rating: number;

    @IsOptional()
    @IsString()
    @MaxLength(2000)
    comment?: string;
}

class UpdateReviewBody {
    @IsOptional()
    @IsInt()
    @Min(1)
    @Max(5)
    rating?: number;

    @IsOptional()
    @IsString()
    @MaxLength(2000)
    comment?: string;
}

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
        @Body() body: CreateReviewBody,
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
        @Body() body: UpdateReviewBody,
    ) {
        return this.reviewsService.update(id, req.user.id, body);
    }

    @Delete(':id')
    async delete(@Request() req: any, @Param('id') id: string) {
        return this.reviewsService.delete(id, req.user.id);
    }
}
