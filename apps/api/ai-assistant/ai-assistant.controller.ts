import { BadRequestException, Body, Controller, Delete, Get, NotFoundException, Param, Post, Query, Request, ServiceUnavailableException, UnauthorizedException, UseGuards, InternalServerErrorException, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AiAssistantService } from './ai-assistant.service';
import { AssistantOrchestratorService } from './assistant-orchestrator.service';
import { GeneralQuestionDto, NutritionAdviceDto } from './dto';
import { AnalyzeLabResultsDto } from './dto/analyze-lab-results.dto';

/**
 * The acting user is always the one from the verified JWT. Older clients still
 * send `userId` in the query/body; it is accepted (so whitelist validation does
 * not reject them) but never trusted.
 */
export function authenticatedUserId(req: any): string {
  const userId = req?.user?.id;
  if (!userId || typeof userId !== 'string') {
    throw new UnauthorizedException('User not authenticated');
  }
  return userId;
}

@ApiTags('AI Assistant')
@Controller('ai-assistant')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AiAssistantController {
  private readonly logger = new Logger(AiAssistantController.name);

  constructor(
    private readonly assistantService: AiAssistantService,
    private readonly orchestrator: AssistantOrchestratorService,
  ) { }

  @Get('flows')
  listFlows() {
    return this.orchestrator.listFlows();
  }

  @Post('session')
  async createSession(
    @Request() req: any,
    @Body('flowId') flowId: string,
    @Body('resume') resume?: boolean,
  ) {
    const userId = authenticatedUserId(req);
    if (!flowId) {
      throw new BadRequestException('flowId is required');
    }
    const response = await this.orchestrator.startSession(flowId, userId, resume ?? true);
    if (response.complete && response.summary) {
      await this.assistantService.logFlowCompletion(userId, response.flowId, response.summary, response.collected);
    }
    return response;
  }

  @Get('session/:sessionId')
  async getSession(@Request() req: any, @Param('sessionId') sessionId: string) {
    const response = await this.orchestrator.resumeSession(sessionId, authenticatedUserId(req));
    if (!response) {
      throw new NotFoundException('Session not found');
    }
    return response;
  }

  @Post('step')
  async submitStep(
    @Request() req: any,
    @Body('sessionId') sessionId: string,
    @Body('input') input: string,
  ) {
    const userId = authenticatedUserId(req);
    if (!sessionId) {
      throw new BadRequestException('sessionId is required');
    }
    const response = await this.orchestrator.submitStep(sessionId, userId, input);
    if (response.complete && response.summary) {
      await this.assistantService.logFlowCompletion(userId, response.flowId, response.summary, response.collected);
    }
    return response;
  }

  @Delete('session/:sessionId')
  async cancelSession(@Request() req: any, @Param('sessionId') sessionId: string) {
    const userId = authenticatedUserId(req);
    await this.orchestrator.cancelSession(sessionId, userId);
    return { status: 'cancelled' };
  }

  @Post('flows/:flowId/start')
  async startFlow(@Request() req: any, @Param('flowId') flowId: string) {
    const userId = authenticatedUserId(req);
    const response = await this.orchestrator.startSession(flowId, userId, true);
    if (response.complete && response.summary) {
      await this.assistantService.logFlowCompletion(userId, response.flowId, response.summary, response.collected);
    }
    return response;
  }

  @Post('flows/:flowId/step')
  async respondToFlow(
    @Request() req: any,
    @Param('flowId') flowId: string,
    @Body('input') input: string,
  ) {
    const userId = authenticatedUserId(req);
    const response = await this.orchestrator.submitStepForFlow(flowId, userId, input);
    if (response.complete && response.summary) {
      await this.assistantService.logFlowCompletion(userId, response.flowId, response.summary, response.collected);
    }
    return response;
  }

  @Post('flows/:flowId/cancel')
  async cancelFlow(@Request() req: any, @Param('flowId') flowId: string) {
    await this.orchestrator.cancelActiveFlow(flowId, authenticatedUserId(req));
    return { status: 'cancelled' };
  }

  @Post('nutrition-advice')
  @ApiOperation({ summary: 'Get nutrition advice' })
  @ApiResponse({ status: 200, description: 'Nutrition advice provided successfully' })
  async getNutritionAdvice(@Body() dto: NutritionAdviceDto, @Request() req: any) {
    const userId = authenticatedUserId(req);
    return this.assistantService.getNutritionAdvice(userId, dto.question, dto.context, dto.language);
  }

  @Post('health-check')
  getHealthCheck(@Request() req: any, @Body('question') question: string, @Body('language') language?: string) {
    return this.assistantService.getHealthCheck(authenticatedUserId(req), question, language);
  }

  @Post('general-question')
  @ApiOperation({ summary: 'Ask general question to AI assistant' })
  @ApiResponse({ status: 200, description: 'Question answered successfully' })
  async getGeneralQuestion(@Body() dto: GeneralQuestionDto, @Request() req: any) {
    const userId = authenticatedUserId(req);
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
  getConversationHistory(@Request() req: any, @Query('limit') limit?: string) {
    return this.assistantService.getConversationHistory(authenticatedUserId(req), limit ? parseInt(limit, 10) : 10);
  }

  @Get('token-usage')
  getTokenUsage(@Request() req: any, @Query('days') days?: string) {
    return this.assistantService.getTokenUsageStats(authenticatedUserId(req), days ? parseInt(days, 10) : 30);
  }

  @Post('lab-results')
  @ApiOperation({ summary: 'Analyze lab results (blood tests)' })
  @ApiResponse({ status: 200, description: 'Lab results analyzed successfully' })
  async analyzeLabResults(
    @Body() dto: AnalyzeLabResultsDto,
    @Request() req: any,
  ) {
    const userId = authenticatedUserId(req);

    try {
      return await this.assistantService.analyzeLabResults(userId, dto);
    } catch (error: any) {
      this.logger.error(
        '[AiAssistantController] analyzeLabResults error',
        {
          message: error.message,
          stack: error.stack,
          status: error.status,
          userId,
          inputType: dto.inputType,
        },
      );

      // If service threw HttpException (BadRequest, etc.) - re-throw as-is
      if (error instanceof BadRequestException) {
        throw error;
      }

      if (error?.message === 'AI_QUOTA_EXCEEDED' || error?.status === 429) {
        throw new ServiceUnavailableException({
          message: 'AI Assistant quota exceeded. Please try again later.',
          code: 'AI_QUOTA_EXCEEDED',
          statusCode: 503,
        });
      }

      // For other errors, throw InternalServerErrorException
      throw new InternalServerErrorException('Failed to analyze lab results');
    }
  }
}
