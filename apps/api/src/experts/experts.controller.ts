import {
    Controller,
    Get,
    Post,
    Patch,
    Delete,
    Param,
    Body,
    Query,
    UseGuards,
    Request,
} from '@nestjs/common';
import { ExpertsService } from './experts.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import {
    CreateExpertProfileDto,
    UpdateExpertProfileDto,
    PublishProfileDto,
    ExpertFiltersDto,
    CreateCredentialDto,
    CreateOfferDto,
    UpdateOfferDto,
    PublishOfferDto,
} from './dto/experts.dto';

@Controller('experts')
export class ExpertsController {
    constructor(private expertsService: ExpertsService) { }

    // ==================== PUBLIC ENDPOINTS ====================

    @Get()
    @UseGuards(JwtAuthGuard)
    async findAll(@Query() filters: ExpertFiltersDto) {
        return this.expertsService.findAll(filters);
    }

    @Get(':id')
    @UseGuards(JwtAuthGuard)
    async findById(@Param('id') id: string) {
        return this.expertsService.findById(id);
    }

    @Get(':id/offers')
    @UseGuards(JwtAuthGuard)
    async getExpertOffers(@Param('id') id: string) {
        return this.expertsService.getOffers(id, true);
    }

    // ==================== MY PROFILE ENDPOINTS ====================

    @Get('me/profile')
    @UseGuards(JwtAuthGuard)
    async getMyProfile(@Request() req: any) {
        return this.expertsService.findByUserId(req.user.id);
    }

    @Post('me/profile')
    @UseGuards(JwtAuthGuard)
    async createProfile(@Request() req: any, @Body() dto: CreateExpertProfileDto) {
        return this.expertsService.createProfile(req.user.id, dto);
    }

    @Patch('me/profile')
    @UseGuards(JwtAuthGuard)
    async updateProfile(@Request() req: any, @Body() dto: UpdateExpertProfileDto) {
        return this.expertsService.updateProfile(req.user.id, dto);
    }

    @Post('me/profile/publish')
    @UseGuards(JwtAuthGuard)
    async publishProfile(@Request() req: any, @Body() dto: PublishProfileDto) {
        return this.expertsService.publishProfile(req.user.id, dto.isPublished);
    }

    // ==================== MY CREDENTIALS ENDPOINTS ====================

    @Get('me/credentials')
    @UseGuards(JwtAuthGuard)
    async getMyCredentials(@Request() req: any) {
        return this.expertsService.getCredentials(req.user.id);
    }

    @Post('me/credentials')
    @UseGuards(JwtAuthGuard)
    async createCredential(@Request() req: any, @Body() dto: CreateCredentialDto) {
        return this.expertsService.createCredential(req.user.id, dto);
    }

    @Delete('me/credentials/:id')
    @UseGuards(JwtAuthGuard)
    async deleteCredential(@Request() req: any, @Param('id') id: string) {
        return this.expertsService.deleteCredential(req.user.id, id);
    }

    // ==================== MY OFFERS ENDPOINTS ====================

    @Get('me/offers')
    @UseGuards(JwtAuthGuard)
    async getMyOffers(@Request() req: any) {
        return this.expertsService.getMyOffers(req.user.id);
    }

    @Post('me/offers')
    @UseGuards(JwtAuthGuard)
    async createOffer(@Request() req: any, @Body() dto: CreateOfferDto) {
        return this.expertsService.createOffer(req.user.id, dto);
    }

    @Patch('me/offers/:id')
    @UseGuards(JwtAuthGuard)
    async updateOffer(
        @Request() req: any,
        @Param('id') id: string,
        @Body() dto: UpdateOfferDto,
    ) {
        return this.expertsService.updateOffer(req.user.id, id, dto);
    }

    @Delete('me/offers/:id')
    @UseGuards(JwtAuthGuard)
    async deleteOffer(@Request() req: any, @Param('id') id: string) {
        return this.expertsService.deleteOffer(req.user.id, id);
    }

    @Post('me/offers/:id/publish')
    @UseGuards(JwtAuthGuard)
    async publishOffer(
        @Request() req: any,
        @Param('id') id: string,
        @Body() dto: PublishOfferDto,
    ) {
        return this.expertsService.publishOffer(req.user.id, id, dto.isPublished);
    }
}
