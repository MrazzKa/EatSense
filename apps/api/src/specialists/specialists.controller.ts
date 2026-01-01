import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { SpecialistsService } from './specialists.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@Controller('specialists')
@UseGuards(JwtAuthGuard)
export class SpecialistsController {
    constructor(private specialistsService: SpecialistsService) { }

    @Get()
    async findAll(
        @Query('type') type?: string,
        @Query('verified') verified?: string,
    ) {
        return this.specialistsService.findAll({
            type,
            isVerified: verified === 'true' ? true : undefined,
        });
    }

    @Get(':id')
    async findById(@Param('id') id: string) {
        return this.specialistsService.findById(id);
    }
}
