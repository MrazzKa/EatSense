import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { PrismaModule } from '../prisma.module';
import { RedisModule } from '../redis/redis.module';
import { CacheModule } from '../src/cache/cache.module';

@Module({
  imports: [PrismaModule, RedisModule, CacheModule],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
