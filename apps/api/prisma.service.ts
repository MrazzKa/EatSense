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
      const isProduction = process.env.NODE_ENV === 'production';

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

      // Check and auto-heal user_profiles.avatarUrl column in production
      if (isProduction) {
        await this.ensureUserProfilesAvatarUrlColumn();
      } else {
        // In non-production, just log a warning if column is missing
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
      }
    } catch (error: any) {
      // Don't crash on schema check failures - migrations may be pending
      this.logger.warn(`[Schema] Schema check failed: ${error?.message || error}`);
    }
  }

  /**
   * Production failsafe: ensure user_profiles.avatarUrl column exists with correct casing.
   *
   * Handles three cases idempotently:
   * 1) Column "avatarUrl" already exists            -> log ✓ and exit
   * 2) Column "avatarurl" (lowercase) exists       -> RENAME COLUMN avatarurl TO "avatarUrl"
   * 3) Neither column exists                       -> ADD COLUMN "avatarUrl" TEXT
   */
  private async ensureUserProfilesAvatarUrlColumn() {
    try {
      const columns =
        await this.$queryRaw<Array<{ column_name: string }>>`
          SELECT column_name
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'user_profiles';
        `;

      const hasCamelCase = columns.some((c) => c.column_name === 'avatarUrl');
      const hasLowerCase = columns.some((c) => c.column_name === 'avatarurl');

      if (hasCamelCase) {
        this.logger.log('[Schema] ✓ user_profiles.avatarUrl column exists');
        return;
      }

      if (hasLowerCase) {
        this.logger.warn(
          '[Schema] ⚠ Found legacy "avatarurl" column in user_profiles – renaming to "avatarUrl"',
        );
        await this.$executeRawUnsafe(
          'ALTER TABLE "user_profiles" RENAME COLUMN avatarurl TO "avatarUrl";',
        );
        this.logger.log('[Schema] ✓ Renamed user_profiles.avatarurl -> "avatarUrl"');
        return;
      }

      this.logger.warn(
        '[Schema] ⚠ user_profiles.avatarUrl column missing – creating it as TEXT (failsafe, migrations may still be needed)',
      );
      await this.$executeRawUnsafe(
        'ALTER TABLE "user_profiles" ADD COLUMN "avatarUrl" TEXT;',
      );
      this.logger.log('[Schema] ✓ Added user_profiles."avatarUrl" column as TEXT');
    } catch (error: any) {
      this.logger.warn(
        `[Schema] Failed to ensure user_profiles.avatarUrl column (will rely on migrations): ${
          error?.message || error
        }`,
      );
    }
  }
}
