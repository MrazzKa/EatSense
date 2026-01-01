import { Controller, Get, Post, Put, Param, Query, UseGuards, Request } from '@nestjs/common';
import { DietProgramsService } from './diet-programs.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('diet-programs')
export class DietProgramsController {
  constructor(private dietProgramsService: DietProgramsService) {}

  @Get()
  async findAll(@Query('category') category?: string, @Query('featured') featured?: string) {
    return this.dietProgramsService.findAll({ category, featured: featured === 'true' });
  }

  @Get('user/my')
  @UseGuards(JwtAuthGuard)
  async getUserPrograms(@Request() req) {
    return this.dietProgramsService.getUserPrograms(req.user.id);
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    return this.dietProgramsService.findByIdOrSlug(id);
  }

  @Get(':id/days/:day')
  async getProgramDay(@Param('id') id: string, @Param('day') day: string) {
    return this.dietProgramsService.getProgramDay(id, parseInt(day, 10));
  }

  @Post(':id/start')
  @UseGuards(JwtAuthGuard)
  async startProgram(@Request() req, @Param('id') id: string) {
    return this.dietProgramsService.startProgram(req.user.id, id);
  }

  @Put(':id/progress/:day')
  @UseGuards(JwtAuthGuard)
  async updateProgress(@Request() req, @Param('id') id: string, @Param('day') day: string) {
    return this.dietProgramsService.updateProgress(req.user.id, id, parseInt(day, 10));
  }
}
