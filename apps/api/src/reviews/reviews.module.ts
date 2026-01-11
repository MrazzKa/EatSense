import { Module, forwardRef } from '@nestjs/common';
import { ReviewsController } from './reviews.controller';
import { ReviewsService } from './reviews.service';
import { PrismaModule } from '../../prisma.module';
import { ExpertsModule } from '../experts/experts.module';

@Module({
    imports: [PrismaModule, forwardRef(() => ExpertsModule)],
    controllers: [ReviewsController],
    providers: [ReviewsService],
    exports: [ReviewsService],
})
export class ReviewsModule { }
