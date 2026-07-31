import { Controller, Get, Query, UseGuards, Request, Headers } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
    constructor(private readonly dashboardService: DashboardService) { }

    @Get()
    async getDashboardData(
        @Request() req: any,
        @Query('date') date?: string,
        @Query('locale') localeQuery?: string,
        @Query('localDate') localDate?: string,
        @Headers('accept-language') acceptLanguage?: string,
    ) {
        // Prefer query locale, fallback to header
        const locale = localeQuery || this.parseLocale(acceptLanguage);

        return this.dashboardService.getDashboardData(
            req.user.id,
            date,
            locale,
            /^\d{4}-\d{2}-\d{2}$/.test(localDate || '') ? localDate : undefined,
        );
    }

    private parseLocale(acceptLanguage?: string): string {
        if (!acceptLanguage) return 'en';
        // Simple parser: take first of 'en', 'ru', 'kk'
        const parts = acceptLanguage.split(',');
        for (const part of parts) {
            const code = part.split(';')[0].trim().toLowerCase().split('-')[0];
            if (['en', 'ru', 'kk'].includes(code)) return code;
        }
        return 'en';
    }
}
