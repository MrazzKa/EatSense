import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit() {
    await this.$connect();
    await this.checkSchema();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  /**
   * Startup schema check: verify critical columns/tables exist.
   * Logs warnings but does not crash if schema is incomplete (migrations may be pending).
   */
  private async checkSchema() {
    try {
      // Check if users.appleUserId column exists
      try {
        await this.$queryRaw`SELECT "appleUserId" FROM "users" LIMIT 1`;
        this.logger.log('[Schema] ✓ users.appleUserId column exists');
      } catch (error: any) {
        if (error?.code === '42703' || error?.message?.includes('does not exist')) {
          this.logger.warn('[Schema] ⚠ users.appleUserId column missing - run migrations');
        } else {
          throw error;
        }
      }

      // Check if medications table exists
      try {
        await this.$queryRaw`SELECT 1 FROM "medications" LIMIT 1`;
        this.logger.log('[Schema] ✓ medications table exists');
      } catch (error: any) {
        if (error?.code === '42P01' || error?.message?.includes('does not exist')) {
          this.logger.warn('[Schema] ⚠ medications table missing - run migrations');
        } else {
          throw error;
        }
      }

      // Check if medication_schedules table exists
      try {
        await this.$queryRaw`SELECT 1 FROM "medication_schedules" LIMIT 1`;
        this.logger.log('[Schema] ✓ medication_schedules table exists');
      } catch (error: any) {
        if (error?.code === '42P01' || error?.message?.includes('does not exist')) {
          this.logger.warn('[Schema] ⚠ medication_schedules table missing - run migrations');
        } else {
          throw error;
        }
      }

      // Check if user_profiles.avatarUrl column exists
      try {
        await this.$queryRaw`SELECT "avatarUrl" FROM "user_profiles" LIMIT 1`;
        this.logger.log('[Schema] ✓ user_profiles.avatarUrl column exists');
      } catch (error: any) {
        if (error?.code === '42703' || error?.message?.includes('does not exist')) {
          this.logger.warn('[Schema] ⚠ user_profiles.avatarUrl column missing - run migrations');
        } else {
          throw error;
        }
      }
    } catch (error: any) {
      // Don't crash on schema check failures - migrations may be pending
      this.logger.warn(`[Schema] Schema check failed: ${error?.message || error}`);
    }
  }
}
