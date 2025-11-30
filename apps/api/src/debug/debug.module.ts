import { Module } from '@nestjs/common';
import { DebugController } from './debug.controller';
import { HybridModule } from '../fdc/hybrid/hybrid.module';

@Module({
  imports: [HybridModule],
  controllers: [DebugController],
})
export class DebugModule {}
