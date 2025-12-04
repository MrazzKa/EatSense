import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectQueue } from '@nestjs/bull';
import type { Queue } from 'bull';

@Injectable()
export class FdcSchedulerService {
  private readonly logger = new Logger(FdcSchedulerService.name);

  constructor(
    @InjectQueue('fdc-update') private readonly updateQueue: Queue,
  ) {}

  /**
   * Monthly import of new Branded foods
   * Runs on 1st day of month at 2 AM
   */
  @Cron('0 2 1 * *')
  async monthlyBrandedImport() {
    this.logger.log('Starting monthly Branded foods import...');
    
    try {
      await this.updateQueue.add('import-branded', {
        type: 'Branded',
        date: new Date().toISOString(),
      });
      
      this.logger.log('Branded import job queued');
    } catch (error: any) {
      this.logger.error(`Error queueing Branded import: ${error.message}`);
    }
  }

  /**
   * Semi-annual Foundation/FNDDS import
   * Runs on Jan 1 and Jul 1 at 3 AM
   */
  @Cron('0 3 1 1,7 *')
  async semiAnnualFoundationImport() {
    this.logger.log('Starting semi-annual Foundation/FNDDS import...');
    
    try {
      await this.updateQueue.add('import-foundation', {
        type: 'Foundation',
        date: new Date().toISOString(),
      });
      
      await this.updateQueue.add('import-fndds', {
        type: 'FNDDS',
        date: new Date().toISOString(),
      });
      
      this.logger.log('Foundation/FNDDS import jobs queued');
    } catch (error: any) {
      this.logger.error(`Error queueing Foundation/FNDDS import: ${error.message}`);
    }
  }
}

