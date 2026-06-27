import { Module } from '@nestjs/common';
import { WaitlistController } from './waitlist.controller';
import { MailerModule } from '../mailer/mailer.module';

@Module({
  imports: [MailerModule],
  controllers: [WaitlistController],
})
export class WaitlistModule {}
