import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma.module';
import { SymptomsController } from './symptoms.controller';
import { SymptomsService } from './symptoms.service';
import { RedFlagPolicy } from './red-flag.policy';

/**
 * Body map ("what is bothering you").
 *
 * RedFlagPolicy is exported deliberately: the AI nutritionist's safety layer and
 * the hotline triage both need the same emergency rule, and they should import
 * this one rather than grow their own.
 */
@Module({
  imports: [PrismaModule],
  controllers: [SymptomsController],
  providers: [SymptomsService, RedFlagPolicy],
  exports: [SymptomsService, RedFlagPolicy],
})
export class SymptomsModule {}
