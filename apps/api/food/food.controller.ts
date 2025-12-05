import { Controller, Post, Body, Get, Param, UseGuards, Request, UploadedFile, UseInterceptors, BadRequestException, ForbiddenException, InternalServerErrorException, Logger } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DailyLimitGuard } from '../limits/daily-limit.guard';
import { DailyLimit } from '../limits/daily-limit.decorator';
import { FoodService } from './food.service';
import { AnalyzeImageDto, AnalyzeTextDto, ReanalyzeDto } from './dto';

@ApiTags('Food Analysis')
@Controller('food')
@UseGuards(JwtAuthGuard, DailyLimitGuard)
@ApiBearerAuth()
export class FoodController {
  private readonly logger = new Logger(FoodController.name);

  constructor(private readonly foodService: FoodService) {}

  @Post('analyze')
  @UseInterceptors(
    FileInterceptor('image', {
      storage: undefined, // Use memory storage (default)
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
      },
    }),
  )
  @DailyLimit({ resource: 'food' }) // Uses FREE_DAILY_ANALYSES or PRO_DAILY_ANALYSES from env
  @ApiOperation({ summary: 'Analyze food image' })
  @ApiResponse({ status: 200, description: 'Analysis completed successfully' })
  @ApiConsumes('multipart/form-data')
  async analyzeImage(
    @UploadedFile() file: any,
    @Body() body: AnalyzeImageDto,
    @Request() req: any,
  ) {
    try {
      if (!file) {
        throw new BadRequestException('No image file provided');
      }
      const userId = req.user?.id;
      if (!userId) {
        throw new BadRequestException('User not authenticated');
      }
      // Locale is optional and validated by DTO; default handled in service
      const locale = body?.locale as 'en' | 'ru' | 'kk' | undefined;
      return await this.foodService.analyzeImage(file, userId, locale);
    } catch (error: any) {
      this.logger.error('[FoodController] analyzeImage error', {
        message: error.message,
        stack: error.stack,
        status: error.status,
        userId: req.user?.id,
      });
      
      // Re-throw BadRequestException as-is
      if (error instanceof BadRequestException) {
        throw error;
      }
      
      // For other errors, throw InternalServerErrorException
      throw new InternalServerErrorException('FOOD_ANALYZE_FAILED');
    }
  }

  @Post('analyze-text')
  @ApiOperation({ summary: 'Analyze food description' })
  @ApiResponse({ status: 200, description: 'Text analysis completed successfully' })
  async analyzeText(
    @Body() analyzeTextDto: AnalyzeTextDto,
    @Request() req: any,
  ) {
    const userId = req.user?.id;
    if (!userId) {
      throw new BadRequestException('User not authenticated');
    }
    const locale = analyzeTextDto.locale as 'en' | 'ru' | 'kk' | undefined;
    return this.foodService.analyzeText(analyzeTextDto.description, userId, locale);
  }

  @Get('analysis/:analysisId/status')
  @ApiOperation({ summary: 'Get analysis status' })
  @ApiResponse({ status: 200, description: 'Analysis status retrieved' })
  async getAnalysisStatus(
    @Param('analysisId') analysisId: string,
    @Request() req: any,
  ) {
    const userId = req.user?.id;
    if (!userId) {
      throw new BadRequestException('User not authenticated');
    }
    return this.foodService.getAnalysisStatus(analysisId, userId);
  }

  @Get('analysis/:analysisId/result')
  @ApiOperation({ summary: 'Get analysis result' })
  @ApiResponse({ status: 200, description: 'Analysis result retrieved' })
  async getAnalysisResult(
    @Param('analysisId') analysisId: string,
    @Request() req: any,
  ) {
    const userId = req.user?.id;
    if (!userId) {
      throw new BadRequestException('User not authenticated');
    }
    return this.foodService.getAnalysisResult(analysisId, userId);
  }

  @Get('analysis/:analysisId/debug')
  @ApiOperation({ summary: 'Get raw analysis data with debug info (dev only)' })
  @ApiResponse({ status: 200, description: 'Raw analysis data retrieved' })
  async getAnalysisDebug(
    @Param('analysisId') analysisId: string,
    @Request() req: any,
  ) {
    // Simple check: only allow if ANALYSIS_DEBUG is enabled or user is admin
    const isDebugMode = process.env.ANALYSIS_DEBUG === 'true';
    if (!isDebugMode) {
      throw new BadRequestException('Debug endpoint is disabled');
    }

    const userId = req.user?.id;
    if (!userId) {
      throw new BadRequestException('User not authenticated');
    }

    return this.foodService.getRawAnalysis(analysisId, userId);
  }

  @Post('analysis/:analysisId/reanalyze')
  @ApiOperation({ summary: 'Re-analyze after manual ingredient edits' })
  @ApiResponse({ status: 200, description: 'Analysis recalculated successfully' })
  async reanalyzeFromManual(
    @Param('analysisId') analysisId: string,
    @Body() body: ReanalyzeDto,
    @Request() req: any,
  ) {
    const userId = req.user?.id;
    if (!userId) {
      throw new BadRequestException('User not authenticated');
    }

    try {
      return await this.foodService.reanalyzeFromManual(analysisId, body, userId);
    } catch (error: any) {
      this.logger.error('[FoodController] reanalyzeFromManual error', {
        message: error.message,
        stack: error.stack,
        status: error.status,
        userId,
        analysisId,
      });

      if (error instanceof BadRequestException || error instanceof ForbiddenException) {
        throw error;
      }

      throw new InternalServerErrorException('REANALYSIS_FAILED');
    }
  }
}
