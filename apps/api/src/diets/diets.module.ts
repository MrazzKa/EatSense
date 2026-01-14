import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DietsController } from './diets.controller';
import { DietsService } from './diets.service';
import { DietRecommendationsService } from './diet-recommendations.service';
import { PrismaModule } from '../../prisma.module';
import { CacheModule } from '../cache/cache.module';

@Module({
    imports: [ConfigModule, PrismaModule, CacheModule],
    controllers: [DietsController],
    providers: [DietsService, DietRecommendationsService],
    exports: [DietsService, DietRecommendationsService],
})
export class DietsModule { }
