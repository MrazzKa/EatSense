import { Module } from '@nestjs/common';
import { AiAssistantController } from './ai-assistant.controller';
import { AiAssistantService } from './ai-assistant.service';
import { PrismaModule } from '../prisma.module';
import { CacheModule } from '../src/cache/cache.module';
import { AssistantOrchestratorService } from './assistant-orchestrator.service';
import { MediaModule } from '../media/media.module';

@Module({
  imports: [PrismaModule, CacheModule, MediaModule],
  controllers: [AiAssistantController],
  providers: [AiAssistantService, AssistantOrchestratorService],
  exports: [AiAssistantService, AssistantOrchestratorService],
})
export class AiAssistantModule { }
