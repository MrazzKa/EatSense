import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { MascotService } from './mascot.service';
import { CreateMascotDto } from './dto/create-mascot.dto';
import { UpdateMascotDto } from './dto/update-mascot.dto';
import { AddXpDto } from './dto/add-xp.dto';

@ApiTags('Mascot')
@Controller('mascot')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class MascotController {
  constructor(private readonly mascotService: MascotService) {}

  @Get()
  @ApiOperation({ summary: 'Get user mascot' })
  async getMascot(@Request() req: any) {
    return this.mascotService.getMascot(req.user.id);
  }

  @Post()
  @ApiOperation({ summary: 'Create user mascot' })
  async createMascot(@Request() req: any, @Body() dto: CreateMascotDto) {
    return this.mascotService.createMascot(req.user.id, dto.mascotType, dto.name);
  }

  @Patch()
  @ApiOperation({ summary: 'Update mascot name or type' })
  async updateMascot(@Request() req: any, @Body() dto: UpdateMascotDto) {
    return this.mascotService.updateMascot(req.user.id, dto);
  }

  @Patch('xp')
  @ApiOperation({ summary: 'Add XP to mascot' })
  async addXp(@Request() req: any, @Body() dto: AddXpDto) {
    return this.mascotService.addXp(req.user.id, dto.amount);
  }

  @Delete()
  @ApiOperation({ summary: 'Delete user mascot' })
  async deleteMascot(@Request() req: any) {
    return this.mascotService.deleteMascot(req.user.id);
  }
}
