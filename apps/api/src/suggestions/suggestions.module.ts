import { Module } from '@nestjs/common';
import { SuggestionsService } from './suggestions.service';
import { SuggestionsController } from './suggestions.controller';
import { StatsModule } from '../../stats/stats.module';
import { PrismaModule } from '../../prisma.module';

@Module({
  imports: [StatsModule, PrismaModule],
  providers: [SuggestionsService],
  controllers: [SuggestionsController],
})
export class SuggestionsModule {}

