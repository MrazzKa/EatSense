import { Body, Controller, Post } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HybridService } from '../fdc/hybrid/hybrid.service';

@Controller('debug')
export class DebugController {
  constructor(
    private readonly hybridService: HybridService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Client-side debug log.
   *
   * Accepts either a batch (`{ entries: [...] }`, what the app sends since it
   * started buffering these instead of posting one per navigation) or a single
   * object, which is what builds already in the wild still send. Each entry is
   * logged on its own line either way, so `grep CLIENT_LOG` keeps working.
   */
  @Post('client-log')
  logClient(@Body() body: any) {
    const entries = Array.isArray(body?.entries) ? body.entries : [body];
    const ts = new Date().toISOString();
    // A batch arrives at once but the lines describe different moments, so each
    // keeps its own `at` when the client sent one.
    for (const entry of entries.slice(0, 100)) {
      console.log('[CLIENT_LOG]', JSON.stringify({ ...entry, ts }));
    }
    return { ok: true, received: entries.length };
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
