import { Controller, Get, Query, UseGuards, Request, Res, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { StatsService } from './stats.service';

@ApiTags('Statistics')
@Controller('stats')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Get dashboard statistics' })
  @ApiResponse({ status: 200, description: 'Dashboard statistics retrieved successfully' })
  async getDashboardStats(@Request() req: any) {
    return this.statsService.getDashboardStats(req.user.id);
  }

  @Get('nutrition')
  @ApiOperation({ summary: 'Get nutrition statistics' })
  @ApiResponse({ status: 200, description: 'Nutrition statistics retrieved successfully' })
  async getNutritionStats(@Request() req: any) {
    return this.statsService.getNutritionStats(req.user.id);
  }

  @Get('progress')
  @ApiOperation({ summary: 'Get progress statistics' })
  @ApiResponse({ status: 200, description: 'Progress statistics retrieved successfully' })
  async getProgressStats(@Request() req: any) {
    return this.statsService.getProgressStats(req.user.id);
  }

  @Get('monthly-report')
  @ApiOperation({ summary: 'Get monthly nutrition report as PDF' })
  @ApiResponse({ status: 200, description: 'PDF report generated successfully' })
  @ApiResponse({ status: 204, description: 'No data available for this month' })
  @ApiResponse({ status: 400, description: 'Invalid month parameter' })
  async getMonthlyReport(
    @Request() req: any,
    @Res() res: Response,
    @Query('year') yearParam?: string,
    @Query('month') monthParam?: string,
    @Query('locale') localeParam?: string,
  ) {
    const userId = req.user.id;
    const now = new Date();
    
    // Parse year and month parameters
    let year: number;
    let month: number;
    
    if (yearParam && monthParam) {
      year = parseInt(yearParam, 10);
      month = parseInt(monthParam, 10);
      
      // Validate month range
      if (month < 1 || month > 12) {
        throw new BadRequestException('Invalid month: must be between 1 and 12');
      }
      
      // Validate year (reasonable range: 2020-2100)
      if (year < 2020 || year > 2100) {
        throw new BadRequestException('Invalid year: must be between 2020 and 2100');
      }
    } else {
      // Use current month if not specified
      year = now.getFullYear();
      month = now.getMonth() + 1;
    }

    const locale = localeParam || 'en';
    
    // Validate locale
    if (!['en', 'ru', 'kk'].includes(locale)) {
      throw new BadRequestException('Invalid locale: must be en, ru, or kk');
    }

    const pdfStream = await this.statsService.generateMonthlyReportPDF(userId, year, month, locale);

    if (!pdfStream) {
      // No data for this month - return 204 No Content
      return res.status(204).send();
    }

    const filename = `EatSense_Monthly_Report_${year}-${String(month).padStart(2, '0')}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${filename}"`,
    );

    pdfStream.pipe(res);
  }
}
