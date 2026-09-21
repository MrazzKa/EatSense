import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SymptomsService } from './symptoms.service';
import { CreateSymptomReportDto } from './dto';
import { describeCatalog } from './symptom-catalog';

@ApiTags('Symptoms')
@Controller('symptoms')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SymptomsController {
  constructor(private readonly service: SymptomsService) {}

  @Get('catalog')
  @ApiOperation({
    summary: 'Body zones, questions and the emergency checklist',
    description:
      'The app ships its own copy so the screen opens offline; this endpoint exists so ' +
      'a mismatch between app and server can be diagnosed without a new build.',
  })
  getCatalog() {
    return describeCatalog();
  }

  @Post('reports')
  @ApiOperation({ summary: 'Log a body-map symptom report' })
  @ApiResponse({ status: 201, description: 'Report stored.' })
  @ApiResponse({ status: 400, description: 'Unknown zone, invalid answer or bad date.' })
  async create(@Request() req: any, @Body() dto: CreateSymptomReportDto) {
    return this.service.create(req.user.id, dto);
  }

  @Get('reports')
  @ApiOperation({ summary: 'Symptom history, newest first' })
  async list(
    @Request() req: any,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
    @Query('cursor') cursor?: string,
  ) {
    return this.service.list(req.user.id, limit ?? 20, cursor);
  }

  @Get('reports/:id')
  @ApiOperation({ summary: 'One symptom report' })
  async getOne(@Request() req: any, @Param('id') id: string) {
    return this.service.getById(req.user.id, id);
  }

  @Delete('reports/:id')
  @ApiOperation({ summary: 'Delete a symptom report' })
  async remove(@Request() req: any, @Param('id') id: string) {
    return this.service.remove(req.user.id, id);
  }
}
