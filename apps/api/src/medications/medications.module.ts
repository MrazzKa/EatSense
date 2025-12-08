import { Module } from '@nestjs/common';
import { MedicationsService } from './medications.service';
import { MedicationsController } from './medications.controller';
import { PrismaModule } from '../../prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [MedicationsService],
  controllers: [MedicationsController],
  exports: [MedicationsService],
})
export class MedicationsModule {}

