import { Module } from '@nestjs/common';
import { SuggestionsService } from './suggestions.service';
import { SuggestionsV2Service } from './suggestions-v2.service';
import { SuggestionsController } from './suggestions.controller';
import { StatsModule } from '../../stats/stats.module';
import { PrismaModule } from '../../prisma.module';

@Module({
  imports: [StatsModule, PrismaModule],
  providers: [SuggestionsService, SuggestionsV2Service],
  controllers: [SuggestionsController],
  exports: [SuggestionsV2Service],
})
export class SuggestionsModule { }

