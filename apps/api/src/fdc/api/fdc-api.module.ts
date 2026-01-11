import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { FdcApiService } from './fdc-api.service';
import { CacheModule } from '../../cache/cache.module';

@Module({
  imports: [
    HttpModule.register({
      baseURL: process.env.FDC_API_BASE || 'https://api.nal.usda.gov/fdc',
      // STEP 2 FIX: Use env variable for timeout instead of hardcoded 5000ms
      // 15s default is more realistic for USDA API response times
      timeout: parseInt(process.env.FDC_TIMEOUT_MS || '15000', 10),
      // Note: USDA FDC API uses api_key as query parameter, not header
      // API key is added in service methods
    }),
    CacheModule,
  ],
  providers: [FdcApiService],
  exports: [FdcApiService],
})
export class FdcApiModule { }
