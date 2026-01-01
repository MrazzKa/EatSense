import { Module } from '@nestjs/common';
import { DietProgramsController } from './diet-programs.controller';
import { DietProgramsService } from './diet-programs.service';
import { PrismaModule } from '../../prisma.module';

@Module({
    imports: [PrismaModule],
    controllers: [DietProgramsController],
    providers: [DietProgramsService],
    exports: [DietProgramsService],
})
export class DietProgramsModule { }
