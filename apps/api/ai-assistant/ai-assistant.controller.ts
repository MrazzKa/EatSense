import { BadRequestException, Body, Controller, Delete, Get, NotFoundException, Param, Post, Query, Request, ServiceUnavailableException, UseGuards, InternalServerErrorException, Logger, UseInterceptors, UploadedFile, ParseFilePipe, MaxFileSizeValidator, FileTypeValidator } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AiAssistantService } from './ai-assistant.service';
import { AssistantOrchestratorService } from './assistant-orchestrator.service';
import { GeneralQuestionDto, LabResultsDto, NutritionAdviceDto } from './dto';

@ApiTags('AI Assistant')
@Controller('ai-assistant')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AiAssistantController {
  private readonly logger = new Logger(AiAssistantController.name);

  constructor(
    private readonly assistantService: AiAssistantService,
    private readonly orchestrator: AssistantOrchestratorService,
  ) {}

  @Get('flows')
  listFlows() {
    return this.orchestrator.listFlows();
  }

  @Post('session')
  async createSession(
    @Body('flowId') flowId: string,
    @Body('userId') userId: string,
    @Body('resume') resume?: boolean,
  ) {
    if (!flowId || !userId) {
      throw new BadRequestException('flowId and userId are required');
    }
    const response = await this.orchestrator.startSession(flowId, userId, resume ?? true);
    if (response.complete && response.summary) {
      await this.assistantService.logFlowCompletion(userId, response.flowId, response.summary, response.collected);
    }
    return response;
  }

  @Get('session/:sessionId')
  async getSession(@Param('sessionId') sessionId: string) {
    const response = await this.orchestrator.resumeSession(sessionId);
    if (!response) {
      throw new NotFoundException('Session not found');
    }
    return response;
  }

  @Post('step')
  async submitStep(
    @Body('sessionId') sessionId: string,
    @Body('userId') userId: string,
    @Body('input') input: string,
  ) {
    if (!sessionId || !userId) {
      throw new BadRequestException('sessionId and userId are required');
    }
    const response = await this.orchestrator.submitStep(sessionId, userId, input);
    if (response.complete && response.summary) {
      await this.assistantService.logFlowCompletion(userId, response.flowId, response.summary, response.collected);
    }
    return response;
  }

  @Delete('session/:sessionId')
  async cancelSession(
    @Param('sessionId') sessionId: string,
    @Query('userId') userIdQuery?: string,
    @Body('userId') userIdBody?: string,
  ) {
    const userId = userIdQuery ?? userIdBody;
    if (!userId) {
      throw new BadRequestException('userId is required');
    }
    await this.orchestrator.cancelSession(sessionId, userId);
    return { status: 'cancelled' };
  }

  @Post('flows/:flowId/start')
  async startFlow(@Param('flowId') flowId: string, @Body('userId') userId: string) {
    const response = await this.orchestrator.startSession(flowId, userId, true);
    if (response.complete && response.summary) {
      await this.assistantService.logFlowCompletion(userId, response.flowId, response.summary, response.collected);
    }
    return response;
  }

  @Post('flows/:flowId/step')
  async respondToFlow(
    @Param('flowId') flowId: string,
    @Body('userId') userId: string,
    @Body('input') input: string,
  ) {
    const response = await this.orchestrator.submitStepForFlow(flowId, userId, input);
    if (response.complete && response.summary) {
      await this.assistantService.logFlowCompletion(userId, response.flowId, response.summary, response.collected);
    }
    return response;
  }

  @Post('flows/:flowId/cancel')
  async cancelFlow(@Param('flowId') flowId: string, @Body('userId') userId: string) {
    await this.orchestrator.cancelActiveFlow(flowId, userId);
    return { status: 'cancelled' };
  }

  @Post('nutrition-advice')
  @ApiOperation({ summary: 'Get nutrition advice' })
  @ApiResponse({ status: 200, description: 'Nutrition advice provided successfully' })
  async getNutritionAdvice(
    @Body() dto: NutritionAdviceDto,
    @Body('userId') userIdFromBody?: string,
    @Request() req?: any,
  ) {
    const userId = dto.userId || userIdFromBody || req?.user?.id;
    if (!userId) {
      throw new BadRequestException('userId is required');
    }
    return this.assistantService.getNutritionAdvice(userId, dto.question, dto.context, dto.language);
  }

  @Post('health-check')
  getHealthCheck(@Body('userId') userId: string, @Body('question') question: string, @Body('language') language?: string) {
    return this.assistantService.getHealthCheck(userId, question, language);
  }

  @Post('general-question')
  @ApiOperation({ summary: 'Ask general question to AI assistant' })
  @ApiResponse({ status: 200, description: 'Question answered successfully' })
  async getGeneralQuestion(@Body() dto: GeneralQuestionDto, @Body('userId') userIdFromBody?: string, @Request() req?: any) {
    const userId = dto.userId || userIdFromBody || req?.user?.id;
    if (!userId) {
      throw new BadRequestException('userId is required');
    }
    try {
      return await this.assistantService.getGeneralQuestion(userId, dto.question, dto.language);
    } catch (error: any) {
      this.logger.error('[AiAssistantController] getGeneralQuestion error', {
        message: error.message,
        stack: error.stack,
        status: error.status,
        userId,
        question: dto.question?.substring(0, 100), // Log first 100 chars only
      });

      // Handle quota exceeded error
      if (error?.message === 'AI_QUOTA_EXCEEDED' || error?.status === 429) {
        throw new ServiceUnavailableException({
          message: 'AI Assistant quota exceeded. Please try again later.',
          code: 'AI_QUOTA_EXCEEDED',
          statusCode: 503,
        });
      }

      // Re-throw BadRequestException as-is
      if (error instanceof BadRequestException) {
      throw error;
      }

      // For other errors, throw InternalServerErrorException
      throw new InternalServerErrorException('AI_ASSISTANT_FAILED');
    }
  }

  @Get('conversation-history')
  getConversationHistory(@Query('userId') userId: string, @Query('limit') limit?: string) {
    return this.assistantService.getConversationHistory(userId, limit ? parseInt(limit, 10) : 10);
  }

  @Get('token-usage')
  getTokenUsage(@Query('userId') userId: string, @Query('days') days?: string) {
    return this.assistantService.getTokenUsageStats(userId, days ? parseInt(days, 10) : 30);
  }

  @Post('lab-results')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Analyze lab results (blood tests)' })
  @ApiResponse({ status: 200, description: 'Lab results analyzed successfully' })
  async analyzeLabResults(
    @Body() dto: LabResultsDto,
    @UploadedFile(
      new ParseFilePipe({
        fileIsRequired: false,
        validators: [
          new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 }), // 10MB
          new FileTypeValidator({ fileType: /(image|pdf)/ }),
        ],
      })
    ) file?: any,
    @Request() req?: any,
  ) {
    const userId = dto.userId || req?.user?.id;
    if (!userId) {
      throw new BadRequestException('userId is required');
    }
    
    // Extract text from body or file
    let rawText = dto.rawText || '';
    
    // TODO: If file is provided, extract text from image/PDF using OCR
    // For now, use rawText from body or placeholder
    if (file && !rawText) {
      rawText = `[Lab results file uploaded: ${file.originalname || 'file'}]`;
      // In production, you would use OCR or PDF parsing here
    }
    
    if (!rawText || rawText.trim().length < 10) {
      throw new BadRequestException('Lab results text is required (at least 10 characters)');
    }
    
    try {
      return await this.assistantService.analyzeLabResults(
        userId, 
        rawText, 
        dto.language,
        dto.labType
      );
    } catch (error: any) {
      if (error?.message === 'AI_QUOTA_EXCEEDED' || error?.status === 429) {
        throw new ServiceUnavailableException({
          message: 'AI Assistant quota exceeded. Please try again later.',
          code: 'AI_QUOTA_EXCEEDED',
          statusCode: 503,
        });
      }
      throw error;
    }
  }
}
