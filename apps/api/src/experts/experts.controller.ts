import {
    Controller,
    Get,
    Post,
    Patch,
    Delete,
    Param,
    Body,
    Query,
    Sse,
    UseGuards,
    Request,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { interval, switchMap, from, map, distinctUntilChanged, takeUntil, Subject } from 'rxjs';
import { ExpertsService } from './experts.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import {
    CreateExpertProfileDto,
    UpdateExpertProfileDto,
    PublishProfileDto,
    ExpertFiltersDto,
    CreateCredentialDto,
    CreateEducationDto,
    UpdateEducationDto,
    CreateOfferDto,
    UpdateOfferDto,
    PublishOfferDto,
} from './dto/experts.dto';
import { IsString, MaxLength } from 'class-validator';

class ApplyExpertCodeDto {
    @IsString()
    @MaxLength(32)
    code: string;
}

@Controller('experts')
export class ExpertsController {
    constructor(
        private expertsService: ExpertsService,
        private config: ConfigService,
    ) { }

    // ==================== PUBLIC ENDPOINTS ====================

    @Get()
    @UseGuards(JwtAuthGuard)
    async findAll(@Request() req: any, @Query() filters: ExpertFiltersDto) {
        if (!this.config.get<boolean>('EXPERT_CATALOG_ENABLED')) {
            return { items: [], total: 0 };
        }
        return this.expertsService.findAll(filters, req.user.id);
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

    @Get('me/access-code')
    @UseGuards(JwtAuthGuard)
    async getMyAccessCode(@Request() req: any) {
        return this.expertsService.getMyAccessCode(req.user.id);
    }

    @Post('me/access-code/regenerate')
    @UseGuards(JwtAuthGuard)
    async regenerateMyAccessCode(@Request() req: any) {
        return this.expertsService.regenerateMyAccessCode(req.user.id);
    }

    @Get('my-specialists')
    @UseGuards(JwtAuthGuard)
    async getMySpecialists(@Request() req: any) {
        return this.expertsService.getMySpecialists(req.user.id);
    }

    @Post('access-code/apply')
    @UseGuards(JwtAuthGuard)
    async applyAccessCode(@Request() req: any, @Body() dto: ApplyExpertCodeDto) {
        return this.expertsService.applyAccessCode(req.user.id, dto.code);
    }

    @Get('me/code-usages')
    @UseGuards(JwtAuthGuard)
    async getMyCodeUsages(@Request() req: any, @Query('take') take?: string) {
        return this.expertsService.listMyCodeUsages(req.user.id, take ? Math.min(parseInt(take, 10) || 25, 200) : 25);
    }

    @Get('me/clients')
    @UseGuards(JwtAuthGuard)
    async getMyClients(@Request() req: any) {
        return this.expertsService.listMyClients(req.user.id);
    }

    @Get('me/clients/:clientId/note')
    @UseGuards(JwtAuthGuard)
    async getClientNote(@Request() req: any, @Param('clientId') clientId: string) {
        return this.expertsService.getClientNote(req.user.id, clientId);
    }

    @Post('me/clients/:clientId/note')
    @UseGuards(JwtAuthGuard)
    async saveClientNote(@Request() req: any, @Param('clientId') clientId: string, @Body() body: { body: string }) {
        return this.expertsService.saveClientNote(req.user.id, clientId, body?.body ?? '');
    }

    @Post('me/vacation')
    @UseGuards(JwtAuthGuard)
    async setVacation(@Request() req: any, @Body() body: { awayUntil?: string | null; awayMessage?: string | null }) {
        return this.expertsService.setVacation(req.user.id, body);
    }

    // SSE stream of client data updates (meals, labs, profile). Polls every 5s.
    // Subscription is terminated when the client disconnects (req 'close' event)
    // so we don't accumulate zombie polls.
    @Sse('me/clients/:clientId/stream')
    @UseGuards(JwtAuthGuard)
    streamClient(@Request() req: any, @Param('clientId') clientId: string) {
        const expertUserId = req.user.id;
        const destroy$ = new Subject<void>();
        const cleanup = () => {
            destroy$.next();
            destroy$.complete();
        };
        req.on?.('close', cleanup);
        req.on?.('aborted', cleanup);
        return interval(5000).pipe(
            takeUntil(destroy$),
            switchMap(() => from(this.expertsService.getClientSnapshot(expertUserId, clientId))),
            map((snapshot) => ({ data: snapshot, type: 'snapshot' })),
            distinctUntilChanged((a, b) => JSON.stringify(a.data) === JSON.stringify(b.data)),
        );
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

    // ==================== MY EDUCATION ENDPOINTS ====================

    @Get('me/education')
    @UseGuards(JwtAuthGuard)
    async getMyEducation(@Request() req: any) {
        return this.expertsService.getEducation(req.user.id);
    }

    @Post('me/education')
    @UseGuards(JwtAuthGuard)
    async createEducation(@Request() req: any, @Body() dto: CreateEducationDto) {
        return this.expertsService.createEducation(req.user.id, dto);
    }

    @Patch('me/education/:id')
    @UseGuards(JwtAuthGuard)
    async updateEducation(
        @Request() req: any,
        @Param('id') id: string,
        @Body() dto: UpdateEducationDto,
    ) {
        return this.expertsService.updateEducation(req.user.id, id, dto);
    }

    @Delete('me/education/:id')
    @UseGuards(JwtAuthGuard)
    async deleteEducation(@Request() req: any, @Param('id') id: string) {
        return this.expertsService.deleteEducation(req.user.id, id);
    }

    // ==================== MY REVIEWS ENDPOINTS ====================

    @Get('me/reviews')
    @UseGuards(JwtAuthGuard)
    async getMyReviews(@Request() req: any) {
        return this.expertsService.getMyReviews(req.user.id);
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

    @Get(':id/offers')
    @UseGuards(JwtAuthGuard)
    async getExpertOffers(@Param('id') id: string) {
        return this.expertsService.getOffers(id, true);
    }

    @Get(':id')
    @UseGuards(JwtAuthGuard)
    async findById(@Param('id') id: string, @Request() req: any) {
        return this.expertsService.findById(id, req.user.id);
    }
}
