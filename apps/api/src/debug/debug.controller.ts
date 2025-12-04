import { Body, Controller, Post } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { HybridService } from '../fdc/hybrid/hybrid.service';

@Controller('debug')
export class DebugController {
  constructor(
    private readonly hybridService: HybridService,
    private readonly config: ConfigService,
  ) {}

  @Post('client-log')
  logClient(@Body() body: any) {
    console.log(
      '[CLIENT_LOG]',
      JSON.stringify({
        ...body,
        ts: new Date().toISOString(),
      }),
    );
    return { ok: true };
  }

  @Post('rehydrate-foods')
  async rehydrateFoods(@Body('limit') limit?: number) {
    const allowed = this.config.get<string>('ADMIN_BYPASS_LIMITS') === 'true';
    if (!allowed) {
      return { ok: false, error: 'Not allowed (ADMIN_BYPASS_LIMITS != true)' };
    }

    const result = await this.hybridService.rehydrateFoodsWithoutNutrients(limit ?? 100);
    return { ok: true, ...result };
  }
}
