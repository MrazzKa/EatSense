import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { FdcService } from './fdc.service';
import { FdcController } from './fdc.controller';
import { PrismaModule } from '../../prisma.module';
import { FtsService } from './fts/fts.service';
import { CacheModule } from '../cache/cache.module';

@Module({
  imports: [
    HttpModule.register({
      baseURL: process.env.FDC_API_BASE || 'https://api.nal.usda.gov/fdc',
      timeout: parseInt(process.env.FDC_TIMEOUT_MS || '10000', 10),
      // Note: USDA FDC API uses api_key as query parameter, not header
      // API key is added in service methods via requestWithRetry
    }),
    PrismaModule,
    CacheModule,
  ],
  providers: [FdcService, FtsService],
  controllers: [FdcController],
  exports: [FdcService],
})
export class FdcModule { }

