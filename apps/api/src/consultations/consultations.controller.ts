import { Controller, Get, Post, Param, UseGuards, Request } from '@nestjs/common';
import { ConsultationsService } from './consultations.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@Controller('consultations')
@UseGuards(JwtAuthGuard)
export class ConsultationsController {
    constructor(private consultationsService: ConsultationsService) { }

    @Post('start/:specialistId')
    async create(@Request() req, @Param('specialistId') specialistId: string) {
        return this.consultationsService.create({
            clientId: req.user.id,
            specialistId,
        });
    }

    @Get('my')
    async findMy(@Request() req) {
        return this.consultationsService.findByClientId(req.user.id);
    }

    @Get('as-specialist')
    async findAsSpecialist(@Request() req) {
        return this.consultationsService.findBySpecialistUserId(req.user.id);
    }

    @Get(':id')
    async findById(@Request() req, @Param('id') id: string) {
        return this.consultationsService.findById(id, req.user.id);
    }
}
