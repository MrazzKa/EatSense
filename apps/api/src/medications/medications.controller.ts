import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Request, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { MedicationsService } from './medications.service';
import { CreateMedicationDto } from './dto/create-medication.dto';
import { UpdateMedicationDto } from './dto/update-medication.dto';

@ApiTags('Medications')
@Controller('medications')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class MedicationsController {
  constructor(private readonly medicationsService: MedicationsService) {}

  @Post()
  @ApiOperation({ summary: 'Create medication schedule' })
  @ApiResponse({ status: 201, description: 'Medication schedule created successfully' })
  async create(@Request() req: any, @Body() dto: CreateMedicationDto) {
    return this.medicationsService.create(req.user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all medication schedules for user' })
  @ApiResponse({ status: 200, description: 'List of medication schedules' })
  async findAll(@Request() req: any, @Query('includeInactive') includeInactive?: string) {
    return this.medicationsService.findAll(req.user.id, includeInactive === 'true');
  }

  @Get('due-today')
  @ApiOperation({ summary: 'Get medications due for today' })
  @ApiResponse({ status: 200, description: 'List of medications due today' })
  async getDueToday(@Request() req: any, @Query('timezone') timezone?: string) {
    return this.medicationsService.getDueToday(req.user.id, timezone || 'UTC');
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get medication schedule by ID' })
  @ApiResponse({ status: 200, description: 'Medication schedule details' })
  async findOne(@Request() req: any, @Param('id') id: string) {
    return this.medicationsService.findOne(req.user.id, id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update medication schedule' })
  @ApiResponse({ status: 200, description: 'Medication schedule updated successfully' })
  async update(@Request() req: any, @Param('id') id: string, @Body() dto: UpdateMedicationDto) {
    return this.medicationsService.update(req.user.id, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete medication schedule' })
  @ApiResponse({ status: 200, description: 'Medication schedule deleted successfully' })
  async remove(@Request() req: any, @Param('id') id: string) {
    await this.medicationsService.remove(req.user.id, id);
    return { message: 'Medication schedule deleted successfully' };
  }
}

