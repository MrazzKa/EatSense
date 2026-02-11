import { Module } from '@nestjs/common';
import { UserProfilesService } from './user-profiles.service';
import { UserProfilesController } from './user-profiles.controller';
import { PrismaModule } from '../prisma.module';
import { CacheModule } from '../src/cache/cache.module';

@Module({
  imports: [PrismaModule, CacheModule],
  controllers: [UserProfilesController],
  providers: [UserProfilesService],
  exports: [UserProfilesService],
})
export class UserProfilesModule {}
