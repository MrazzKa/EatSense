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
            // Create single-page compact PDF
            const doc = new PDFDocument({
                margin: 40,
                size: 'A4',
                autoFirstPage: true,
                bufferPages: true, // Buffer all pages so we can control output
            });
            const buffers: Buffer[] = [];

            doc.on('data', buffers.push.bind(buffers));
            doc.on('end', () => resolve(Buffer.concat(buffers)));
            doc.on('error', reject);

            // Localized Strings
            const t = this.getTranslations(locale);
            const monthNames = this.getMonthNames(locale);
            const monthName = monthNames[month - 1] || `${month}`;

            // --- Compact Header ---
            doc.fontSize(22).font('Helvetica-Bold').text('EatSense', { align: 'center' });
            doc.fontSize(14).font('Helvetica').text(t.reportTitle, { align: 'center' });
            doc.fontSize(11).text(`${monthName} ${year} • ${profile?.firstName || 'User'}`, { align: 'center' });
            doc.moveDown(1);

            // --- Calculate Summary stats ---
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
            const avgProtein = Math.round(totalProtein / daysCount);
            const avgCarbs = Math.round(totalCarbs / daysCount);
            const avgFat = Math.round(totalFat / daysCount);

            // --- Summary Box ---
            const boxY = doc.y;
            const boxWidth = doc.page.width - 80;
            doc.rect(40, boxY, boxWidth, 80).fill('#f5f5f5');

            doc.fill('#333333').fontSize(12).font('Helvetica-Bold');
            doc.text(t.summary, 50, boxY + 10);

            doc.fontSize(10).font('Helvetica');
            const col1X = 50;
            const col2X = 200;
            const col3X = 350;

            doc.text(`${t.totalMeals}: ${meals.length}`, col1X, boxY + 30);
            doc.text(`${t.daysTracked}: ${daysCount}`, col1X, boxY + 45);

            doc.text(`${t.avgCalories}: ${avgCals} kcal`, col2X, boxY + 30);
            doc.text(`${t.avgProtein}: ${avgProtein}g`, col2X, boxY + 45);

            doc.text(`${t.avgCarbs}: ${avgCarbs}g`, col3X, boxY + 30);
            doc.text(`${t.avgFat}: ${avgFat}g`, col3X, boxY + 45);

            doc.y = boxY + 90;

            // --- Totals ---
            doc.fontSize(11).font('Helvetica-Bold').text(t.monthlyTotals, 40);
            doc.fontSize(10).font('Helvetica');
            doc.text(`${t.totalCalories}: ${Math.round(totalCals)} kcal | ${t.protein}: ${Math.round(totalProtein)}g | ${t.carbs}: ${Math.round(totalCarbs)}g | ${t.fat}: ${Math.round(totalFat)}g`, 40);
            doc.moveDown(1);

            // --- Top foods (compact list) ---
            const foodCounts: Record<string, { count: number; calories: number }> = {};
            meals.forEach(meal => {
                meal.items.forEach(item => {
                    const name = item.name || 'Unknown';
                    if (!foodCounts[name]) {
                        foodCounts[name] = { count: 0, calories: 0 };
                    }
                    foodCounts[name].count++;
                    foodCounts[name].calories += item.calories || 0;
                });
            });

            const topFoods = Object.entries(foodCounts)
                .sort((a, b) => b[1].count - a[1].count)
                .slice(0, 5);

            if (topFoods.length > 0) {
                doc.fontSize(11).font('Helvetica-Bold').text(t.topFoods, 40);
                doc.fontSize(9).font('Helvetica');
                topFoods.forEach(([name, data], idx) => {
                    doc.text(`${idx + 1}. ${name} (×${data.count}, ${Math.round(data.calories)} kcal ${t.total})`, 40);
                });
                doc.moveDown(1);
            }

            // --- Daily breakdown (compact, only show dates with data) ---
            const mealsByDate: Record<string, { meals: number; calories: number; protein: number; carbs: number; fat: number }> = {};
            meals.forEach(meal => {
                const dateStr = meal.consumedAt.toISOString().split('T')[0];
                if (!mealsByDate[dateStr]) {
                    mealsByDate[dateStr] = { meals: 0, calories: 0, protein: 0, carbs: 0, fat: 0 };
                }
                mealsByDate[dateStr].meals++;
                meal.items.forEach(item => {
                    mealsByDate[dateStr].calories += item.calories || 0;
                    mealsByDate[dateStr].protein += item.protein || 0;
                    mealsByDate[dateStr].carbs += item.carbs || 0;
                    mealsByDate[dateStr].fat += item.fat || 0;
                });
            });

            const sortedDates = Object.keys(mealsByDate).sort().reverse();

            if (sortedDates.length > 0) {
                doc.fontSize(11).font('Helvetica-Bold').text(t.dailyBreakdown, 40);
                doc.fontSize(8).font('Helvetica');

                // Calculate available space for table (page height minus footer minus current position)
                const pageHeight = doc.page.height;
                const footerSpace = 50; // Space reserved for footer
                const availableHeight = pageHeight - doc.y - footerSpace;
                const rowHeight = 11;
                const headerHeight = 17;
                const maxRows = Math.floor((availableHeight - headerHeight) / rowHeight);

                // Dynamically limit rows to fit on page (minimum 3, maximum 15)
                const displayCount = Math.min(Math.max(maxRows, 3), 15, sortedDates.length);
                const displayDates = sortedDates.slice(0, displayCount);
                const tableY = doc.y + 5;

                // Table header
                doc.font('Helvetica-Bold');
                doc.text(t.date, 40, tableY);
                doc.text(t.mealsLabel, 130, tableY);
                doc.text('kcal', 180, tableY);
                doc.text('P(g)', 240, tableY);
                doc.text('C(g)', 290, tableY);
                doc.text('F(g)', 340, tableY);

                doc.font('Helvetica');
                displayDates.forEach((date, idx) => {
                    const data = mealsByDate[date];
                    const rowY = tableY + 12 + (idx * rowHeight);

                    // Alternate row background
                    if (idx % 2 === 0) {
                        doc.rect(38, rowY - 2, 320, rowHeight).fill('#fafafa');
                        doc.fill('#333333');
                    }

                    doc.text(date, 40, rowY);
                    doc.text(String(data.meals), 130, rowY);
                    doc.text(String(Math.round(data.calories)), 180, rowY);
                    doc.text(String(Math.round(data.protein)), 240, rowY);
                    doc.text(String(Math.round(data.carbs)), 290, rowY);
                    doc.text(String(Math.round(data.fat)), 340, rowY);
                });

                if (sortedDates.length > displayCount) {
                    doc.y = tableY + 12 + (displayCount * rowHeight) + 5;
                    doc.fontSize(8).text(`...${t.andMore} ${sortedDates.length - displayCount} ${t.moreDays}`, 40);
                }
            }

            // --- Footer ---
            doc.fontSize(8).fill('#999999');
            doc.text(`${t.generatedBy} EatSense • ${new Date().toISOString().split('T')[0]}`, 40, doc.page.height - 40, { align: 'center' });

            // Ensure only first page is kept (safety for single-page guarantee)
            const range = doc.bufferedPageRange();
            if (range.count > 1) {
                this.logger.warn(`[ReportsService] PDF had ${range.count} pages, truncating to 1`);
            }

            doc.end();
        });
    }

    private getMonthNames(locale: string): string[] {
        const en = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        const ru = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
        const kk = ['Қаңтар', 'Ақпан', 'Наурыз', 'Сәуір', 'Мамыр', 'Маусым', 'Шілде', 'Тамыз', 'Қыркүйек', 'Қазан', 'Қараша', 'Желтоқсан'];

        if (locale === 'ru') return ru;
        if (locale === 'kk') return kk;
        if (locale === 'fr') return ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
        return en;
    }

    private getTranslations(locale: string) {
        const en = {
            reportTitle: 'Monthly Nutrition Report',
            summary: 'Summary',
            avgCalories: 'Avg Calories',
            avgProtein: 'Avg Protein',
            avgCarbs: 'Avg Carbs',
            avgFat: 'Avg Fat',
            totalMeals: 'Total Meals',
            daysTracked: 'Days Tracked',
            monthlyTotals: 'Monthly Totals',
            totalCalories: 'Total Calories',
            protein: 'Protein',
            carbs: 'Carbs',
            fat: 'Fat',
            topFoods: 'Most Eaten Foods',
            total: 'total',
            dailyBreakdown: 'Daily Breakdown',
            date: 'Date',
            mealsLabel: 'Meals',
            andMore: 'and',
            moreDays: 'more days',
            generatedBy: 'Generated by',
        };

        const ru = {
            reportTitle: 'Отчёт по питанию',
            summary: 'Сводка',
            avgCalories: 'Ср. калории',
            avgProtein: 'Ср. белки',
            avgCarbs: 'Ср. углеводы',
            avgFat: 'Ср. жиры',
            totalMeals: 'Всего приёмов пищи',
            daysTracked: 'Дней отслежено',
            monthlyTotals: 'Итоги за месяц',
            totalCalories: 'Всего калорий',
            protein: 'Белки',
            carbs: 'Углеводы',
            fat: 'Жиры',
            topFoods: 'Популярные продукты',
            total: 'всего',
            dailyBreakdown: 'По дням',
            date: 'Дата',
            mealsLabel: 'Приёмы',
            andMore: 'и ещё',
            moreDays: 'дней',
            generatedBy: 'Создано',
        };

        const kk = {
            reportTitle: 'Тамақтану есебі',
            summary: 'Қорытынды',
            avgCalories: 'Орт. калория',
            avgProtein: 'Орт. ақуыз',
            avgCarbs: 'Орт. көмірсу',
            avgFat: 'Орт. май',
            totalMeals: 'Барлық тамақтану',
            daysTracked: 'Бақыланған күн',
            monthlyTotals: 'Ай қорытындысы',
            totalCalories: 'Жалпы калория',
            protein: 'Ақуыз',
            carbs: 'Көмірсу',
            fat: 'Май',
            topFoods: 'Жиі тағамдар',
            total: 'барлығы',
            dailyBreakdown: 'Күнделік',
            date: 'Күні',
            mealsLabel: 'Тамақ',
            andMore: 'және тағы',
            moreDays: 'күн',
            generatedBy: 'Жасаған',
        };

        if (locale === 'ru') return ru;
        if (locale === 'kk') return kk;
        if (locale === 'fr') return {
            reportTitle: 'Rapport nutritionnel mensuel',
            summary: 'Résumé',
            avgCalories: 'Calories moy.',
            avgProtein: 'Protéines moy.',
            avgCarbs: 'Glucides moy.',
            avgFat: 'Lipides moy.',
            totalMeals: 'Total repas',
            daysTracked: 'Jours suivis',
            monthlyTotals: 'Totaux mensuels',
            totalCalories: 'Total calories',
            protein: 'Protéines',
            carbs: 'Glucides',
            fat: 'Lipides',
            topFoods: 'Aliments fréquents',
            total: 'total',
            dailyBreakdown: 'Détail quotidien',
            date: 'Date',
            mealsLabel: 'Repas',
            andMore: 'et',
            moreDays: 'autres jours',
            generatedBy: 'Généré par',
        };
        return en;
    }
}
