import { Module } from '@nestjs/common';
import { SpecialistsController } from './specialists.controller';
import { SpecialistsService } from './specialists.service';
import { PrismaModule } from '../../prisma.module';

@Module({
    imports: [PrismaModule],
    controllers: [SpecialistsController],
    providers: [SpecialistsService],
    exports: [SpecialistsService],
})
export class SpecialistsModule { }
