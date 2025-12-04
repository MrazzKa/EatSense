import { Module } from '@nestjs/common';
import { SuggestionsService } from './suggestions.service';
import { SuggestionsController } from './suggestions.controller';
import { StatsModule } from '../../stats/stats.module';

@Module({
  imports: [StatsModule],
  providers: [SuggestionsService],
  controllers: [SuggestionsController],
})
export class SuggestionsModule {}

