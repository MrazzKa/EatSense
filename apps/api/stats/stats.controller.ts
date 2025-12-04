import { Controller, Get, Query, UseGuards, Request, Res } from '@nestjs/common';
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
  async getMonthlyReport(
    @Request() req: any,
    @Res() res: Response,
    @Query('month') monthStr?: string,
  ) {
    const userId = req.user.id;
    const now = new Date();
    
    // Parse month string in format YYYY-MM or use current month
    let year: number;
    let month: number;
    
    if (monthStr && /^\d{4}-\d{2}$/.test(monthStr)) {
      const [yearPart, monthPart] = monthStr.split('-').map(Number);
      year = yearPart;
      month = monthPart;
    } else {
      year = now.getFullYear();
      month = now.getMonth() + 1;
    }

    const pdfStream = await this.statsService.generateMonthlyReportPDF(userId, year, month);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="eatsense-report-${year}-${String(month).padStart(2, '0')}.pdf"`,
    );

    pdfStream.pipe(res);
  }
}
