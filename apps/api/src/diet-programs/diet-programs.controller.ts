import { Controller, Get, Post, Param, Query, UseGuards, Request } from '@nestjs/common';
import { DietProgramsService } from './diet-programs.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@Controller('diet-programs')
@UseGuards(JwtAuthGuard)
export class DietProgramsController {
    constructor(private dietProgramsService: DietProgramsService) { }

    @Get()
    async findAll(@Query('category') category?: string) {
        return this.dietProgramsService.findAll({ category });
    }

    @Get(':id')
    async findById(@Param('id') id: string) {
        return this.dietProgramsService.findById(id);
    }

    @Post(':id/start')
    async startProgram(@Request() req, @Param('id') programId: string) {
        return this.dietProgramsService.startProgram(req.user.id, programId);
    }

    @Get(':id/progress')
    async getProgress(@Request() req, @Param('id') programId: string) {
        return this.dietProgramsService.getProgress(req.user.id, programId);
    }

    @Post(':id/complete-day')
    async completeDay(@Request() req, @Param('id') programId: string) {
        return this.dietProgramsService.completeDay(req.user.id, programId);
    }
}
