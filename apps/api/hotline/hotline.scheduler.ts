import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { HotlineService } from './hotline.service';

/**
 * Keeps the queue honest when nobody is reading it. Expiry also happens lazily
 * on every read, but an empty portal and an app in someone's pocket read
 * nothing — and that is exactly when the "nobody was free" push matters.
 */
@Injectable()
export class HotlineScheduler {
  private readonly logger = new Logger(HotlineScheduler.name);

  constructor(private readonly hotline: HotlineService) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async sweep() {
    try {
      await this.hotline.expireStale();
      await this.hotline.closeAbandoned();
    } catch (error: any) {
      this.logger.warn(`[Hotline] sweep failed: ${error?.message}`);
    }
  }
}
