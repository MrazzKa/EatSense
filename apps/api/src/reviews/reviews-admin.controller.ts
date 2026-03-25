import {
    Controller,
    Get,
    Delete,
    Patch,
    Param,
    Headers,
    UnauthorizedException,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ReviewsService } from './reviews.service';

@ApiTags('Reviews Admin')
@Controller('reviews/admin')
export class ReviewsAdminController {
    constructor(private readonly reviewsService: ReviewsService) {}

    private validateAdmin(adminSecret: string) {
        const expectedSecret = process.env.ADMIN_SECRET;
        if (!expectedSecret || adminSecret !== expectedSecret) {
            throw new UnauthorizedException('Invalid admin credentials');
        }
    }

    @Get()
    @ApiOperation({ summary: 'Admin: list all reviews' })
    async getAll(@Headers('x-admin-secret') adminSecret: string) {
        this.validateAdmin(adminSecret);
        return this.reviewsService.findAll();
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Admin: delete any review' })
    async deleteReview(
        @Headers('x-admin-secret') adminSecret: string,
        @Param('id') id: string,
    ) {
        this.validateAdmin(adminSecret);
        return this.reviewsService.adminDelete(id);
    }

    @Patch(':id/toggle-visibility')
    @ApiOperation({ summary: 'Admin: toggle review visibility' })
    async toggleVisibility(
        @Headers('x-admin-secret') adminSecret: string,
        @Param('id') id: string,
    ) {
        this.validateAdmin(adminSecret);
        return this.reviewsService.adminToggleVisibility(id);
    }
}
