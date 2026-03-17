import { Module } from '@nestjs/common';
import { MascotService } from './mascot.service';
import { MascotController } from './mascot.controller';
import { PrismaModule } from '../../prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [MascotService],
  controllers: [MascotController],
  exports: [MascotService],
})
export class MascotModule {}
