import { Controller, Get, Post, Body, Param, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { HybridService } from '../hybrid/hybrid.service';

@ApiTags('FDC Integrations')
@Controller('integrations/fdc')
// @UseGuards(JwtAuthGuard) // Temporarily disabled for testing
// @ApiBearerAuth()
export class FdcIntegrationsController {
  constructor(private readonly hybrid: HybridService) {}

  @Post('search')
  @ApiOperation({ summary: 'Search foods via hybrid search' })
  @ApiResponse({ status: 200, description: 'Foods found' })
  async searchFoods(
    @Body() body: { query: string; dataType?: string[]; pageSize?: number },
  ) {
    const { query, pageSize = 10 } = body;
    const results = await this.hybrid.findByText(query, pageSize, 0.7);
    
    return {
      foods: results.map(r => ({
        fdcId: r.fdcId,
        description: r.description,
        dataType: r.dataType,
        score: r.score,
        source: r.source,
      })),
      total: results.length,
    };
  }

  @Get('food/:id')
  @ApiOperation({ summary: 'Get normalized food by FDC ID' })
  @ApiResponse({ status: 200, description: 'Food data retrieved' })
  async getFood(@Param('id') id: string) {
    const fdcId = parseInt(id, 10);
    if (isNaN(fdcId)) {
      throw new Error('Invalid FDC ID');
    }
    
    return await this.hybrid.getFoodNormalized(fdcId);
  }
}

