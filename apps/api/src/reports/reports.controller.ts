import { Controller, Get, Query, Req, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ReportsService } from './reports.service';

@Controller('reports')
@UseGuards(JwtAuthGuard)
export class ReportsController {
    constructor(private readonly reportsService: ReportsService) { }

    @Get('monthly')
    async getMonthlyReport(
        @Req() req: any,
        @Res() res: Response,
        @Query('year') year: string,
        @Query('month') month: string,
        @Query('locale') locale: string = 'en',
    ) {
        const userId = req.user.id;
        const yearNum = parseInt(year, 10) || new Date().getFullYear();
        const monthNum = parseInt(month, 10) || new Date().getMonth() + 1;

        const pdfBuffer = await this.reportsService.generateMonthlyReport(
            userId,
            yearNum,
            monthNum,
            locale,
        );

        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename=report-${yearNum}-${monthNum}.pdf`,
            'Content-Length': pdfBuffer.length,
        });

        res.end(pdfBuffer);
    }
}
