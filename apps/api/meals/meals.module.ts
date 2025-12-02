import { Module } from '@nestjs/common';
import { MealsController } from './meals.controller';
import { MealsService } from './meals.service';
import { PrismaModule } from '../prisma.module';
import { CacheModule } from '../src/cache/cache.module';

@Module({
  imports: [PrismaModule, CacheModule],
  controllers: [MealsController],
  providers: [MealsService],
  exports: [MealsService],
})
export class MealsModule {}
