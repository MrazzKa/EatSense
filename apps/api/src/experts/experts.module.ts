import { Module } from '@nestjs/common';
import { ExpertsController } from './experts.controller';
import { ExpertsAdminController } from './experts-admin.controller';
import { ExpertsService } from './experts.service';
import { PrismaModule } from '../../prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
    imports: [PrismaModule, NotificationsModule],
    controllers: [ExpertsController, ExpertsAdminController],
    providers: [ExpertsService],
    exports: [ExpertsService],
})
export class ExpertsModule { }
