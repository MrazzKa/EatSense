import { Module } from '@nestjs/common';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { StatsModule } from '../stats/stats.module';
import { MealsModule } from '../meals/meals.module';
import { UsersModule } from '../users/users.module';
import { SuggestionsModule } from '../src/suggestions/suggestions.module';
import { DietsModule } from '../src/diets/diets.module';
import { PrismaModule } from '../prisma.module';
import { DietProgramsModule } from '../src/diet-programs/diet-programs.module';

@Module({
    imports: [
        StatsModule,
        MealsModule,
        UsersModule,
        SuggestionsModule,
        DietsModule,
        DietProgramsModule,
        PrismaModule,
    ],
    controllers: [DashboardController],
    providers: [DashboardService],
    exports: [DashboardService],
})
export class DashboardModule { }
