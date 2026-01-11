import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { BullModule } from '@nestjs/bull';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from './prisma.module';
import { AuthModule } from './auth/auth.module';
import { FoodModule } from './food/food.module';
import { MealsModule } from './meals/meals.module';
import { MediaModule } from './media/media.module';
import { UsersModule } from './users/users.module';
import { StatsModule } from './stats/stats.module';
import { SessionsModule } from './sessions/sessions.module';
import { JwtModule } from './jwt/jwt.module';
import { MailerModule } from './mailer/mailer.module';
import { QueuesModule } from './queues/queues.module';
import { RedisModule } from './redis/redis.module';
import { CacheModule } from './src/cache/cache.module';
import { WellKnownModule } from './well-known/well-known.module';
import { AiAssistantModule } from './ai-assistant/ai-assistant.module';
import { UserProfilesModule } from './user-profiles/user-profiles.module';
import { LimitsModule } from './limits/limits.module';
import { FdcModule } from './src/fdc/fdc.module';
import { FdcApiModule } from './src/fdc/api/fdc-api.module';
import { HybridModule } from './src/fdc/hybrid/hybrid.module';
import { AnalysisModule } from './src/analysis/analysis.module';
import { FdcIntegrationsModule } from './src/fdc/integrations/fdc-integrations.module';
import { FdcSchedulerModule } from './src/fdc/scheduler/fdc-scheduler.module';
import { ArticlesModule } from './articles/articles.module';
import { HealthController } from './health.controller';
import { configSchema } from './src/config/config.schema';
import { NotificationsModule } from './src/notifications/notifications.module';
import { DebugModule } from './src/debug/debug.module';
import { SuggestionsModule } from './src/suggestions/suggestions.module';
import { OpenFoodFactsModule } from './src/openfoodfacts/openfoodfacts.module';
import { MedicationsModule } from './src/medications/medications.module';
import { ExpertsModule } from './src/experts/experts.module';
import { ConversationsModule } from './src/conversations/conversations.module';
import { MessagesModule } from './src/messages/messages.module';
import { ReviewsModule } from './src/reviews/reviews.module';
import { DietProgramsModule } from './src/diet-programs/diet-programs.module';
import { DietsModule } from './src/diets/diets.module';
import { ReferralsModule } from './src/referrals/referrals.module';
import { ReportsModule } from './src/reports/reports.module';
import { SafetyModule } from './src/safety/safety.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: configSchema,
      envFilePath: '.env',
    }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 1 minute
        limit: 100, // 100 requests per minute
      },
    ]),
    BullModule.forRoot({
      redis: (() => {
        // Priority: REDIS_URL > REDIS_HOST/PORT/PASSWORD
        // BullModule doesn't support URL directly, so we parse it
        if (process.env.REDIS_URL) {
          try {
            const url = new URL(process.env.REDIS_URL);
            return {
              host: url.hostname,
              port: parseInt(url.port || '6379'),
              password: url.password || undefined,
            };
          } catch (error) {
            console.warn('[BullModule] Failed to parse REDIS_URL, falling back to HOST/PORT');
          }
        }
        return {
          host: process.env.REDIS_HOST || 'localhost',
          port: parseInt(process.env.REDIS_PORT || '6379'),
          password: process.env.REDIS_PASSWORD || undefined,
        };
      })(),
    }),
    PrismaModule,
    AuthModule,
    FoodModule,
    MealsModule,
    MediaModule,
    UsersModule,
    StatsModule,
    SessionsModule,
    JwtModule,
    MailerModule,
    QueuesModule,
    RedisModule,
    CacheModule,
    WellKnownModule,
    AiAssistantModule,
    UserProfilesModule,
    LimitsModule,
    FdcModule,
    FdcApiModule,
    HybridModule,
    AnalysisModule,
    FdcIntegrationsModule,
    FdcSchedulerModule,
    ArticlesModule,
    NotificationsModule,
    DebugModule,
    SuggestionsModule,
    OpenFoodFactsModule,
    MedicationsModule,
    ExpertsModule,
    ConversationsModule,
    MessagesModule,
    ReviewsModule,
    DietProgramsModule,
    DietsModule,
    ReferralsModule,
    ReportsModule,
    SafetyModule,
  ],
  controllers: [HealthController],
})
export class AppModule { }
