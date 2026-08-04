import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { DataRequestsAdminController } from './data-requests-admin.controller';
import { UsersService } from './users.service';
import { PrismaModule } from '../prisma.module';
import { RedisModule } from '../redis/redis.module';
import { CacheModule } from '../src/cache/cache.module';
import { MailerModule } from '../mailer/mailer.module';

@Module({
  imports: [PrismaModule, RedisModule, CacheModule, MailerModule],
  controllers: [UsersController, DataRequestsAdminController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
