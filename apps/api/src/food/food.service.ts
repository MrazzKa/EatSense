import { Injectable } from '@nestjs/common';
import { FoodAnalyzerService } from '../../food/food-analyzer/food-analyzer.service';
import { MediaService, type UploadResult } from '../../media/media.service';
import { PrismaService } from '../../prisma.service';
import { InjectQueue } from '@nestjs/bull';
import type { Queue } from 'bull';

@Injectable()
export class FoodService {
  constructor(
    private readonly foodAnalyzerService: FoodAnalyzerService,
    private readonly mediaService: MediaService,
    private readonly prisma: PrismaService,
    @InjectQueue('food-analysis') private foodAnalysisQueue: Queue,
  ) {}

  async analyzeImage(file: any, userId: string = 'temp-user'): Promise<{
    jobId: string | number;
    message: string;
    media: UploadResult;
  }> {
    const media = await this.mediaService.uploadFile(file, userId);
    const job = await this.foodAnalysisQueue.add('analyze-image', { imageUrl: media.url, userId }, {});
    return { jobId: job.id, message: 'Image analysis started', media };
  }

  async analyzeText(description: string) {
    const job = await this.foodAnalysisQueue.add('analyze-text', { description, userId: 'temp-user' }, {});
    return { jobId: job.id, message: 'Text analysis started' };
  }

  async getAnalysisResult(jobId: string) {
    const job = await this.foodAnalysisQueue.getJob(jobId);
    if (!job) {
      return { status: 'not_found' };
    }
    if (job.finishedOn && job.returnvalue) {
      return { status: 'completed', result: job.returnvalue };
    }
    if (job.failedReason) {
      return { status: 'failed', error: job.failedReason };
    }
    return { status: job.progress() ? 'in_progress' : 'pending', progress: job.progress() };
  }

  async getUserMeals(userId: string) {
    return this.prisma.meal.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }
}