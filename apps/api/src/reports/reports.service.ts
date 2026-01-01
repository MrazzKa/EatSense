import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import PDFDocument from 'pdfkit';

@Injectable()
export class ReportsService {
    private readonly logger = new Logger(ReportsService.name);

    constructor(private readonly prisma: PrismaService) { }

    async generateMonthlyReport(
        userId: string,
        year: number,
        month: number,
        locale: string,
    ): Promise<Buffer> {
        this.logger.log(`Generating report for user=${userId} ${month}/${year} locale=${locale}`);

        // Fetch user profile for name
        const profile = await this.prisma.userProfile.findUnique({
            where: { userId },
        });

        // Fetch meals
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0, 23, 59, 59);

        const meals = await this.prisma.meal.findMany({
            where: {
                userId,
                consumedAt: {
                    gte: startDate,
                    lte: endDate,
                },
            },
            include: {
                items: true,
            },
            orderBy: {
                consumedAt: 'desc',
            },
        });

        return new Promise((resolve, reject) => {
            const doc = new PDFDocument({ margin: 50 });
            const buffers: Buffer[] = [];

            doc.on('data', buffers.push.bind(buffers));
            doc.on('end', () => resolve(Buffer.concat(buffers)));
            doc.on('error', reject);

            // Localized Strings
            const t = this.getTranslations(locale);

            // --- Header ---
            doc.fontSize(20).text('EatSense', { align: 'center' });
            doc.moveDown();
            doc.fontSize(16).text(t.reportTitle, { align: 'center' });
            doc.fontSize(12).text(`${t.period}: ${month}/${year}`, { align: 'center' });
            doc.text(`${t.user}: ${profile?.firstName || 'User'}`, { align: 'center' });
            doc.moveDown(2);

            // --- Summary stats ---
            let totalCals = 0;
            let totalProtein = 0;
            let totalFat = 0;
            let totalCarbs = 0;

            meals.forEach(m => {
                m.items.forEach(i => {
                    totalCals += i.calories || 0;
                    totalProtein += i.protein || 0;
                    totalFat += i.fat || 0;
                    totalCarbs += i.carbs || 0;
                });
            });

            const daysCount = new Set(meals.map(m => m.consumedAt.toISOString().split('T')[0])).size || 1;
            const avgCals = Math.round(totalCals / daysCount);

            doc.fontSize(14).text(t.summary);
            doc.fontSize(12).text(`${t.avgCalories}: ${avgCals} kcal`);
            doc.text(`${t.totalMeals}: ${meals.length}`);
            doc.moveDown(2);

            // --- Meals List ---
            doc.fontSize(14).text(t.details);
            doc.moveDown();

            meals.forEach(meal => {
                const dateStr = meal.consumedAt.toISOString().split('T')[0];
                doc.fontSize(12).font('Helvetica-Bold').text(`${dateStr}`);

                meal.items.forEach(item => {
                    const itemName = item.name;
                    doc.fontSize(10).font('Helvetica')
                        .text(`- ${itemName}: ${item.calories} kcal (P:${item.protein}g F:${item.fat}g C:${item.carbs}g)`);
                });
                doc.moveDown(0.5);
            });

            doc.end();
        });
    }

    private getTranslations(locale: string) {
        const en = {
            reportTitle: 'Monthly Nutrition Report',
            period: 'Period',
            user: 'User',
            summary: 'Summary',
            avgCalories: 'Average Daily Calories',
            totalMeals: 'Total Meals Logged',
            details: 'Daily Details',
        };

        const ru = {
            reportTitle: 'Отчет по питанию за месяц',
            period: 'Период',
            user: 'Пользователь',
            summary: 'Сводка',
            avgCalories: 'Средние калории в день',
            totalMeals: 'Всего приемов пищи',
            details: 'Детализация по дням',
        };

        const kk = {
            reportTitle: 'Ай сайынғы тамақтану есебі',
            period: 'Кезең',
            user: 'Пайдаланушы',
            summary: 'Қорытынды',
            avgCalories: 'Тәуліктік орташа калория',
            totalMeals: 'Барлық тамақтану',
            details: 'Күнделікті мәліметтер',
        };

        if (locale === 'ru') return ru;
        if (locale === 'kk') return kk;
        return en;
    }
}
