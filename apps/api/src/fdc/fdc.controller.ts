import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import type { FdcService } from './fdc.service';
import type { SearchFoodsDto } from './dto/search-foods.dto';

@ApiTags('USDA FoodData Central')
@Controller('v1/integrations/fdc')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class FdcController {
  constructor(private readonly fdcService: FdcService) {}

  @Post('search')
  @ApiOperation({ summary: 'Search foods in USDA database' })
  @ApiResponse({ status: 200, description: 'Search results' })
  async search(@Body() body: SearchFoodsDto) {
    return this.fdcService.searchFoods(body);
  }

  @Get('food/:id')
  @ApiOperation({ summary: 'Get food details by FDC ID' })
  @ApiResponse({ status: 200, description: 'Food details' })
  async getFood(
    @Param('id') id: string,
    @Query('format') format?: 'abridged' | 'full',
    @Query('nutrients') nutrients?: string,
  ) {
    const nutrientIds = nutrients ? nutrients.split(',').map(Number).filter(n => !isNaN(n)) : undefined;
    return this.fdcService.getFood(id, { format, nutrients: nutrientIds });
  }

  @Post('foods')
  @ApiOperation({ summary: 'Get multiple foods by FDC IDs' })
  @ApiResponse({ status: 200, description: 'Food details array' })
  async getFoods(
    @Body() body: { fdcIds: (number | string)[]; format?: 'abridged' | 'full'; nutrients?: number[] },
  ) {
    return this.fdcService.getFoods(body.fdcIds, { format: body.format, nutrients: body.nutrients });
  }

  @Post('list')
  @ApiOperation({ summary: 'List foods with pagination' })
  @ApiResponse({ status: 200, description: 'Food list' })
  async listFoods(@Body() body: any) {
    return this.fdcService.listFoods(body);
  }
}

