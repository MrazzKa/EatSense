import { Module } from '@nestjs/common';
import { PharmacyService } from './pharmacy.service';
import { PharmacyController } from './pharmacy.controller';
import { PrismaModule } from '../../prisma.module';
import { MailerModule } from '../../mailer/mailer.module';

@Module({
  imports: [PrismaModule, MailerModule],
  providers: [PharmacyService],
  controllers: [PharmacyController],
  exports: [PharmacyService],
})
export class PharmacyModule {}
