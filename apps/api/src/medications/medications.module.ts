import { Module, forwardRef } from '@nestjs/common';
import { MedicationsService } from './medications.service';
import { MedicationsController } from './medications.controller';
import { PrismaModule } from '../../prisma.module';
import { PharmacyModule } from '../pharmacy/pharmacy.module';

@Module({
  imports: [PrismaModule, forwardRef(() => PharmacyModule)],
  providers: [MedicationsService],
  controllers: [MedicationsController],
  exports: [MedicationsService],
})
export class MedicationsModule {}
