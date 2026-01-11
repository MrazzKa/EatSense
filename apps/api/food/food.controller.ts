import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Param,
  Request,
  Headers,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { FoodService } from './food.service';
import { AnalyzeImageDto, AnalyzeTextDto, ReanalyzeRequestDto } from './dto';
import type { Express } from 'express';

@ApiTags('Food Analysis')
@Controller('food')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class FoodController {
  constructor(private readonly foodService: FoodService) { }

  @Post('analyze')
  @UseInterceptors(FileInterceptor('image'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: AnalyzeImageDto })
  @ApiOperation({ summary: 'Analyze food image' })
  @ApiResponse({ status: 201, description: 'Analysis started' })
  async analyzeImage(
    @UploadedFile() file: any,
    @Body() body: AnalyzeImageDto,
    @Request() req: any,
    @Headers('x-skip-cache') skipCacheHeader?: string,
  ) {
    const skipCache = skipCacheHeader === 'true' || skipCacheHeader === '1';
    return this.foodService.analyzeImage(file, req.user.id, body.locale, body.foodDescription, skipCache);
  }

  @Post('analyze-text')
  @ApiOperation({ summary: 'Analyze food from text description' })
  @ApiResponse({ status: 201, description: 'Analysis started' })
  async analyzeText(
    @Body() body: AnalyzeTextDto,
    @Request() req: any,
    @Headers('x-skip-cache') skipCacheHeader?: string,
  ) {
    const skipCache = skipCacheHeader === 'true' || skipCacheHeader === '1';
    return this.foodService.analyzeText(body.description, req.user.id, body.locale, skipCache);
  }

  @Get('analysis/:id/status')
  @ApiOperation({ summary: 'Get analysis status' })
  @ApiResponse({ status: 200, description: 'Analysis status' })
  async getAnalysisStatus(@Param('id') id: string, @Request() req: any) {
    return this.foodService.getAnalysisStatus(id, req.user.id);
  }

  @Get('analysis/:id/result')
  @ApiOperation({ summary: 'Get analysis result' })
  @ApiResponse({ status: 200, description: 'Analysis result' })
  async getAnalysisResult(@Param('id') id: string, @Request() req: any) {
    return this.foodService.getAnalysisResult(id, req.user.id);
  }

  @Post('analysis/:id/reanalyze')
  @ApiOperation({ summary: 'Re-analyze from original input' })
  @ApiResponse({ status: 200, description: 'Re-analysis started' })
  async reanalyze(@Param('id') id: string, @Body() body: ReanalyzeRequestDto, @Request() req: any) {
    return this.foodService.reanalyzeFromOriginalInput(id, body, req.user.id);
  }

  @Post('analysis/:id/manual-reanalyze')
  @ApiOperation({ summary: 'Re-analyze with manually edited items' })
  @ApiResponse({ status: 200, description: 'Re-analysis completed' })
  async manualReanalyze(@Param('id') id: string, @Body() body: any, @Request() req: any) {
    return this.foodService.manualReanalyze(id, req.user.id, body.items);
  }

  @Get('analyses/active')
  @ApiOperation({ summary: 'Get active analyses for current user' })
  @ApiResponse({ status: 200, description: 'Active analyses list' })
  async getActiveAnalyses(@Request() req: any) {
    return this.foodService.getActiveAnalyses(req.user.id);
  }

  @Post('corrections')
  @ApiOperation({ summary: 'Save analysis correction for feedback loop' })
  @ApiResponse({ status: 201, description: 'Correction saved successfully' })
  async saveCorrection(@Request() req: any, @Body() body: any) {
    return this.foodService.saveCorrection(req.user.id, body);
  }

  // =====================================================
  // OBSERVABILITY: Debug endpoint for development only
  // =====================================================
  @Get('analysis/:id/debug')
  @ApiOperation({ summary: 'Get analysis debug bundle (dev only)' })
  @ApiResponse({ status: 200, description: 'Debug bundle with raw vision, nutrition, and final result' })
  async getAnalysisDebug(@Param('id') id: string, @Request() req: any) {
    // Only allow in development mode
    if (process.env.NODE_ENV === 'production') {
      return { error: 'Debug endpoint not available in production' };
    }

    const result = await this.foodService.getAnalysisResult(id, req.user.id);

    return {
      analysisId: id,
      status: result?.status || 'unknown',
      dishName: {
        localized: result?.data?.dishNameLocalized,
        original: result?.data?.originalDishName,
        source: result?.data?.dishNameSource,
        confidence: result?.data?.dishNameConfidence,
      },
      totals: result?.data?.total,
      itemCount: result?.data?.items?.length || 0,
      items: result?.data?.items?.map((i: any) => ({
        name: i.name,
        originalName: i.originalName,
        source: i.source,
        provider: i.provider,
        portionG: i.portion_g,
        nutrients: i.nutrients,
        isFallback: i.isFallback,
        sourceInfo: i.sourceInfo,
      })),
      visionRaw: result?.data?.debug?.componentsRaw,
      debug: result?.data?.debug,
      healthScore: result?.data?.healthScore,
      flags: {
        isSuspicious: result?.data?.isSuspicious,
        needsReview: result?.data?.needsReview,
      },
    };
  }
}
