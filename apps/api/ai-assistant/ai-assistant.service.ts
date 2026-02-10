import { Injectable, Logger, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import OpenAI from 'openai';
import { AssistantOrchestratorService } from './assistant-orchestrator.service';
import { MediaService } from '../media/media.service';

@Injectable()
export class AiAssistantService {
  private readonly logger = new Logger(AiAssistantService.name);
  private readonly openai: OpenAI;

  constructor(
    private readonly prisma: PrismaService,
    private readonly orchestrator: AssistantOrchestratorService,
    private readonly mediaService: MediaService,
  ) {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  async getNutritionAdvice(userId: string, question: string, context?: any, language?: string) {
    const result = await this.generateCompletion('nutrition_advice', userId, question, context, 0.7, language);
    return result;
  }

  async getHealthCheck(userId: string, question: string, language?: string) {
    // Increased temperature to 0.5 for more diverse responses, with frequency/presence penalties
    const result = await this.generateCompletion('health_check', userId, question, undefined, 0.5, language);
    return result;
  }

  async getGeneralQuestion(userId: string, question: string, language?: string) {
    const result = await this.generateCompletion('general_question', userId, question, undefined, 0.7, language);
    return result;
  }

  async getConversationHistory(userId: string, limit: number = 10) {
    return this.prisma.aiAssistant.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async getTokenUsageStats(userId: string, days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const conversations = await this.prisma.aiAssistant.findMany({
      where: {
        userId,
        createdAt: {
          gte: startDate,
        },
      },
      select: {
        tokensUsed: true,
        promptTokens: true,
        completionTokens: true,
        createdAt: true,
      },
    });

    const totalTokens = conversations.reduce((sum, c) => sum + (c.tokensUsed || 0), 0);
    const totalPromptTokens = conversations.reduce((sum, c) => sum + (c.promptTokens || 0), 0);
    const totalCompletionTokens = conversations.reduce((sum, c) => sum + (c.completionTokens || 0), 0);

    return {
      period: `${days} days`,
      totalRequests: conversations.length,
      totalTokens,
      totalPromptTokens,
      totalCompletionTokens,
      averageTokensPerRequest: conversations.length > 0 ? Math.round(totalTokens / conversations.length) : 0,
      dailyUsage: this.calculateDailyUsage(conversations, days),
    };
  }

  async logFlowCompletion(userId: string, flowId: string, summary: string, collected: Record<string, any>) {
    try {
      // Verify user exists before saving
      const userExists = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { id: true },
      });

      if (userExists) {
        await this.prisma.aiAssistant.create({
          data: {
            userId,
            type: flowId,
            question: '[flow-completion]',
            answer: summary,
            tokensUsed: 0,
            promptTokens: 0,
            completionTokens: 0,
            context: { flowId, collected },
          },
        });
      } else {
        // User may have been deleted or doesn't exist - this is harmless, just skip history save
        this.logger.debug(`[AiAssistantService] User not found for flow completion log: ${userId} (skipping)`);
      }
    } catch (error: any) {
      // Log but don't throw - flow completion logging is non-critical
      this.logger.error('[AiAssistantService] Failed to log flow completion', {
        userId,
        flowId,
        error: error.message,
        errorCode: error.code,
      });
    }
  }

  /**
   * Get localized error message based on language and error type
   */
  private getLocalizedErrorMessage(language: string, errorType: 'empty_response' | 'api_error' | 'quota_exceeded'): string {
    const messages: Record<string, Record<string, string>> = {
      empty_response: {
        ru: 'Извините, я не смог обработать ваш вопрос. Пожалуйста, попробуйте переформулировать.',
        kk: 'Кешіріңіз, сұрағыңызды өңдей алмадым. Қайта тұжырымдап көріңіз.',
        en: 'Sorry, I could not process your question. Please try rephrasing.',
      },
      api_error: {
        ru: 'Произошла ошибка при обработке запроса. Пожалуйста, попробуйте позже.',
        kk: 'Сұранысты өңдеу кезінде қате орын алды. Кейінірек көріңіз.',
        en: 'An error occurred while processing your request. Please try again later.',
      },
      quota_exceeded: {
        ru: 'Достигнут лимит запросов к AI. Попробуйте позже или обновите подписку.',
        kk: 'AI сұраныстарының шегіне жеттік. Кейінірек көріңіз немесе жазылымды жаңартыңыз.',
        en: 'AI request limit reached. Please try again later or upgrade your subscription.',
      },
    };

    return messages[errorType]?.[language] || messages[errorType]?.['en'] || 'An error occurred.';
  }

  private async generateCompletion(
    type: 'nutrition_advice' | 'health_check' | 'general_question',
    userId: string,
    question: string,
    extraContext?: any,
    temperature: number = 0.7,
    language?: string,
  ) {
    const { systemPrompt, context } = await this.buildSystemPrompt(type, userId, extraContext, language);

    try {
      const model = process.env.OPENAI_MODEL || 'gpt-4o';
      this.logger.debug(`[AiAssistantService] Using model: ${model} for type: ${type}`);

      const response = await this.openai.chat.completions.create({
        // Use configurable GPT model (default gpt-4.1)
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: question },
        ],
        max_completion_tokens: 900,
        temperature,
        // Add frequency and presence penalties for health_check to reduce repetition
        ...(type === 'health_check' && {
          frequency_penalty: 0.4,
          presence_penalty: 0.2,
        }),
      });
      // Localized fallback message when OpenAI doesn't return content
      const fallbackMessage = this.getLocalizedErrorMessage(language || 'en', 'empty_response');
      const answer = response.choices[0]?.message?.content || fallbackMessage;
      const usage = response.usage;

      // Save history - non-critical, don't fail the request if this fails
      let historyRecord: any = null;
      try {
        // Verify user exists before saving history
        const userExists = await this.prisma.user.findUnique({
          where: { id: userId },
          select: { id: true },
        });

        if (userExists) {
          historyRecord = await this.prisma.aiAssistant.create({
            data: {
              userId,
              type,
              question,
              answer,
              tokensUsed: usage?.total_tokens || 0,
              promptTokens: usage?.prompt_tokens || 0,
              completionTokens: usage?.completion_tokens || 0,
              context,
            },
          });
          this.logger.debug(`[AiAssistantService] History saved for userId: ${userId}, type: ${type}`);
        } else {
          // User may have been deleted or doesn't exist - this is harmless, just skip history save
          this.logger.debug(`[AiAssistantService] User not found for history save: ${userId} (skipping)`);
        }
      } catch (historyError: any) {
        // Log but don't throw - history saving is non-critical
        this.logger.error('[AiAssistantService] Failed to save conversation history', {
          userId,
          type,
          error: historyError.message,
          errorName: historyError.name,
          errorCode: historyError.code,
          // Don't log full stack in production
          ...(process.env.NODE_ENV === 'development' && { stack: historyError.stack }),
        });
        // Continue - don't fail the request
      }

      return {
        answer,
        tokensUsed: usage?.total_tokens || 0,
        promptTokens: usage?.prompt_tokens || 0,
        completionTokens: usage?.completion_tokens || 0,
        historyId: historyRecord?.id || null,
      };
    } catch (error: any) {
      this.logger.error('[AiAssistantService] OpenAI API error', {
        message: error.message,
        name: error.name,
        stack: error.stack,
        status: error?.status,
        responseStatus: error?.response?.status,
        responseData: error?.response?.data,
        model: process.env.OPENAI_MODEL || 'gpt-4.1',
        type,
        userId,
      });

      // Handle OpenAI API errors
      if (error?.status === 429 || error?.response?.status === 429) {
        // Re-throw with specific error code for quota exceeded
        const quotaError: any = new Error('AI_QUOTA_EXCEEDED');
        quotaError.status = 429;
        throw quotaError;
      }
      // Re-throw other errors
      throw error;
    }
  }

  private async buildSystemPrompt(
    type: 'nutrition_advice' | 'health_check' | 'general_question',
    userId: string,
    extraContext?: any,
    language?: string,
  ) {
    // Get user language from profile or use provided language or default to English
    const userProfile = await this.prisma.userProfile.findUnique({ where: { userId } });
    const userLanguage = language || (userProfile?.preferences as any)?.language || 'en';

    // Map language codes to language names for OpenAI
    const languageMap: Record<string, string> = {
      en: 'English',
      ru: 'Russian',
      kk: 'Kazakh',
      es: 'Spanish',
      de: 'German',
      fr: 'French',
      it: 'Italian',
      ko: 'Korean',
      ja: 'Japanese',
      zh: 'Chinese',
    };
    const responseLanguage = languageMap[userLanguage] || 'English';

    if (type === 'general_question') {
      return {
        systemPrompt: `You are a nutrition and health assistant. Provide accurate, concise, and actionable answers.

CRITICAL RULES:
1. ALWAYS provide short, structured, and actionable responses.
2. For food analysis questions:
   - ALWAYS state what is OK about the meal and what is not (e.g., too much sugar, not enough protein).
   - ALWAYS give clear next steps: how to improve the meal, how to adjust portion sizes, etc.
3. Ask clarifying questions if needed to provide better advice.
4. NEVER give formal diagnoses or prescribe treatment - only provide nutrition-focused guidance and general explanations.
5. EVERY response must include a short disclaimer that this is not medical advice and users should consult a doctor for medical decisions.
6. Be encouraging and supportive.
7. Respond in ${responseLanguage}.

Example response format:
- What's good: [positive aspects]
- What to improve: [areas for improvement]
- Next steps: [actionable recommendations]
- Disclaimer: This is not medical advice. Please consult a healthcare professional for medical decisions.`,
        context: {},
      };
    }
    const recentMeals = await this.prisma.meal.findMany({
      where: { userId },
      include: { items: true },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });
    const recentAnalyses = await this.prisma.analysis.findMany({
      where: { userId },
      include: { results: true },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    const basePrompt = type === 'nutrition_advice'
      ? this.buildNutritionSystemPrompt(userProfile, recentMeals, recentAnalyses, responseLanguage)
      : this.buildHealthCheckSystemPrompt(userProfile, responseLanguage);

    const context = {
      userProfile,
      recentMeals: recentMeals.map((meal) => ({
        name: meal.name,
        createdAt: meal.createdAt,
        items: meal.items.map((item) => ({
          name: item.name,
          calories: item.calories,
          protein: item.protein,
          fat: item.fat,
          carbs: item.carbs,
        })),
      })),
      recentAnalyses,
      extraContext,
    };

    return { systemPrompt: basePrompt, context };
  }

  private calculateDailyUsage(conversations: any[], days: number) {
    const dailyMap = new Map<string, number>();
    conversations.forEach((conv) => {
      const date = conv.createdAt.toISOString().split('T')[0];
      dailyMap.set(date, (dailyMap.get(date) || 0) + (conv.tokensUsed || 0));
    });
    return Array.from(dailyMap.entries())
      .map(([date, tokens]) => ({ date, tokens }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  private buildNutritionSystemPrompt(userProfile: any, recentMeals: any[], recentAnalyses: any[], language: string = 'English') {
    let prompt = `You are a professional nutritionist and healthy eating coach. Provide personalized nutrition advice based on the user's profile and eating habits.

User Profile:
- Age: ${userProfile?.age || 'not specified'}
- Height: ${userProfile?.height ? `${userProfile.height} cm` : 'not specified'}
- Weight: ${userProfile?.weight ? `${userProfile.weight} kg` : 'not specified'}
- Gender: ${userProfile?.gender || 'not specified'}
- Activity Level: ${userProfile?.activityLevel || 'not specified'}
- Goal: ${userProfile?.goal || 'not specified'}
- Daily Calorie Target: ${userProfile?.dailyCalories || 'not specified'}

Recent Meals:`;

    if (recentMeals.length > 0) {
      recentMeals.forEach((meal) => {
        prompt += `\n- ${meal.name} (${meal.createdAt ? new Date(meal.createdAt).toLocaleDateString('en-US') : 'no date'})`;
        meal.items.forEach((item) => {
          prompt += `\n  * ${item.name}: ${item.calories} kcal, ${item.protein}g protein, ${item.fat}g fat, ${item.carbs}g carbs`;
        });
      });
    } else {
      prompt += '\nNo recent meals recorded.';
    }

    prompt += `\n\nRecent Food Analyses:`;
    if (recentAnalyses.length > 0) {
      recentAnalyses.forEach((analysis) => {
        prompt += `\n- ${analysis.type} analysis from ${new Date(analysis.createdAt).toLocaleDateString('en-US')}`;
      });
    } else {
      prompt += '\nNo recent analyses.';
    }

    prompt += `\n\nIMPORTANT RULES:
1. ALWAYS provide short, structured, and actionable responses.
2. For food analysis:
   - ALWAYS state what is OK about the meal and what is not (e.g., too much sugar, not enough protein).
   - ALWAYS give clear next steps: how to improve the meal, how to adjust portion sizes, etc.
3. Provide personalized advice based on profile and eating habits.
4. Suggest specific dietary improvements considering goals and activity level.
5. Be encouraging and supportive.
6. Suggest meal ideas where appropriate.
7. NEVER give formal diagnoses or prescribe treatment - only provide nutrition-focused guidance and general explanations.
8. EVERY response must include a short disclaimer that this is not medical advice and users should consult a doctor for medical decisions.
9. Respond in ${language}.`;

    return prompt;
  }

  private buildHealthCheckSystemPrompt(userProfile: any, language: string = 'English') {
    return `You are a health and wellness assistant. Provide personalized, concise, and actionable feedback based on the user's specific question and profile.

User Profile:
- Age: ${userProfile?.age || 'not specified'}
- Height: ${userProfile?.height ? `${userProfile.height} cm` : 'not specified'}
- Weight: ${userProfile?.weight ? `${userProfile.weight} kg` : 'not specified'}
- Gender: ${userProfile?.gender || 'not specified'}
- Activity Level: ${userProfile?.activityLevel || 'not specified'}

OUTPUT FORMAT (always follow this structure):

1. Summary – 2–3 short sentences tailored to the user's specific question. Reference their question directly, not generic advice.

2. Key points – 3–5 bullet points with concrete observations based on what the user described. Be specific to their situation.

3. Recommendations – 3–5 specific, realistic suggestions that the user can implement. Consider their profile (age, activity level) when making recommendations.

4. Warning – when to contact a doctor or emergency services. Only include if relevant to the user's question.

5. Disclaimer – clearly state this is not medical advice and the user should consult a doctor for medical decisions.

CRITICAL RULES:
* Always answer in ${language}.
* Always refer to the user's specific question and avoid generic copy-pasted advice.
* Never give diagnoses or prescribe medications.
* Never invent lab values or precise probabilities.
* Be supportive, non-alarmist, but honest about potential risks.
* Personalize your response based on the user's profile when relevant.
* If the user asks about symptoms, ask clarifying questions and recommend professional consultation.
`;
  }

  public async analyzeLabResults(userId: string, dto: { inputType: 'text' | 'file'; text?: string; fileId?: string; fileName?: string; mimeType?: string; locale?: string }) {
    const { inputType, text, fileId, fileName, mimeType, locale } = dto;
    const normalizedLocale = (locale || 'en').toLowerCase();

    if (inputType === 'text') {
      if (!text || !text.trim()) {
        throw new BadRequestException('Lab results text is required for inputType="text".');
      }
      return this.analyzeLabResultsText(userId, text.trim(), normalizedLocale);
    }

    if (inputType === 'file') {
      if (!fileId) {
        throw new BadRequestException('File-based lab results analysis is not yet configured. Please use text mode.');
      }
      return this.analyzeLabResultsFile(userId, fileId, {
        fileName,
        mimeType,
        locale: normalizedLocale,
      });
    }

    throw new BadRequestException(`Unsupported inputType: ${inputType}`);
  }

  private async analyzeLabResultsText(userId: string, text: string, locale: string) {
    this.logger.log(
      `[AiAssistantService] analyzeLabResultsText() called, locale=${locale}`,
    );

    const userProfile = await this.prisma.userProfile.findUnique({ where: { userId } });
    const userLanguage = locale || (userProfile?.preferences as any)?.language || 'en';

    const languageMap: Record<string, string> = {
      en: 'English',
      ru: 'Russian',
      kk: 'Kazakh',
      es: 'Spanish',
      de: 'German',
      fr: 'French',
      it: 'Italian',
      ko: 'Korean',
      ja: 'Japanese',
      zh: 'Chinese',
    };
    const responseLanguage = languageMap[userLanguage] || 'English';

    // FIX #4: Pass inputType='text' to distinguish manual input from uploaded document
    const prompt = this.buildLabResultsPrompt(text, responseLanguage, 'text');

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o', // Use GPT-4o for better medical text analysis
        messages: [
          { role: 'system', content: prompt },
          { role: 'user', content: `Analyze these lab results:\n\n${text}` },
        ],
        max_completion_tokens: 4000,
        temperature: 0.2, // Lower temperature for more consistent medical analysis
        response_format: { type: 'json_object' },
      });

      const content = response.choices[0]?.message?.content || '{}';
      const parsed = JSON.parse(content);

      // Save to database
      const labResult = await this.prisma.labResult.create({
        data: {
          userId,
          rawText: text,
          summary: parsed.summary || '',
          recommendation: parsed.recommendation || '',
        },
      });

      // Save metrics
      if (Array.isArray(parsed.metrics)) {
        await Promise.all(
          parsed.metrics.map((metric: any) =>
            this.prisma.labMetric.create({
              data: {
                labResultId: labResult.id,
                name: metric.name || '',
                value: metric.value || 0,
                unit: metric.unit || '',
                isNormal: metric.isNormal !== false,
                level: metric.level || 'normal',
                comment: metric.comment || null,
              },
            }),
          ),
        );
      }

      return {
        id: labResult.id,
        metrics: parsed.metrics || [],
        summary: parsed.summary || '',
        recommendation: parsed.recommendation || '',
        rawInterpretation: {
          prompt,
          locale,
        },
      };
    } catch (error: any) {
      this.logger.error(
        `[AiAssistant] LLM error while analyzing lab results for user=${userId}`,
        error?.stack || error,
      );

      if (error?.status === 429 || error?.response?.status === 429) {
        const quotaError: any = new Error('AI_QUOTA_EXCEEDED');
        quotaError.status = 429;
        throw quotaError;
      }

      throw new InternalServerErrorException('AI_LAB_RESULTS_FAILED');
    }
  }

  private async analyzeLabResultsFile(
    userId: string,
    fileId: string,
    opts: { fileName?: string; mimeType?: string; locale: string },
  ) {
    this.logger.log(
      `[AiAssistantService] analyzeLabResultsFile() called, fileId=${fileId}, locale=${opts.locale}`,
    );

    // Get media file as base64 for Vision API
    const mediaData = await this.mediaService.getMediaAsBase64(fileId);
    if (!mediaData) {
      throw new BadRequestException('File not found or could not be retrieved');
    }

    const userProfile = await this.prisma.userProfile.findUnique({ where: { userId } });
    const userLanguage = opts.locale || (userProfile?.preferences as any)?.language || 'en';

    const languageMap: Record<string, string> = {
      en: 'English',
      ru: 'Russian',
      kk: 'Kazakh',
      es: 'Spanish',
      de: 'German',
      fr: 'French',
      it: 'Italian',
      ko: 'Korean',
      ja: 'Japanese',
      zh: 'Chinese',
    };
    const responseLanguage = languageMap[userLanguage] || 'English';

    // Build image-specific prompt for OCR + analysis
    // FIX #4: Pass inputType='file' to indicate this is from uploaded document
    const imagePrompt = this.buildLabResultsImagePrompt(responseLanguage, 'file');

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o', // Use GPT-4o for Vision analysis of medical docs

        messages: [
          { role: 'system', content: imagePrompt },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'First, carefully transcribe ALL text visible in this document using OCR. Then analyze the extracted values. If the image contains a medical report, extract all metrics, units, and reference ranges. If the image is blurry, rotated, or text is not readable, return a summary explaining the specific issue.',
              },
              {
                type: 'image_url',
                image_url: {
                  url: mediaData.dataUrl,
                  detail: 'high',
                },
              },
            ],
          },
        ],
        max_completion_tokens: 4000,
        temperature: 0.2,
        response_format: { type: 'json_object' },
      });

      const content = response.choices[0]?.message?.content || '{}';

      this.logger.debug(`[AiAssistantService] Vision API response for lab results:`, content.substring(0, 500));

      let parsed: any;
      try {
        parsed = JSON.parse(content);
      } catch (parseError) {
        this.logger.error(`[AiAssistantService] Failed to parse Vision API response:`, content);
        throw new Error('Failed to parse lab results analysis');
      }

      // Check if image was unreadable
      if (parsed.error || (!parsed.metrics?.length && !parsed.summary)) {
        const errorMessage = parsed.error || parsed.summary || 'Could not extract lab results from image';
        this.logger.warn(`[AiAssistantService] Vision API could not read lab results image:`, errorMessage);

        return {
          id: null,
          metrics: [],
          summary: responseLanguage === 'Russian'
            ? `Не удалось распознать текст на изображении. Пожалуйста, убедитесь, что фото четкое, хорошо освещено и текст читаем.`
            : responseLanguage === 'Kazakh'
              ? `Суреттегі мәтінді оқу мүмкін болмады. Фотосуреттің анық, жақсы жарықтандырылған және мәтіннің оқылатынына көз жеткізіңіз.`
              : `Could not read text in the image. Please ensure the photo is clear, well-lit, and the text is legible.`,
          recommendation: '',
          rawInterpretation: {
            fileId,
            fileName: opts.fileName,
            mimeType: opts.mimeType,
            locale: opts.locale,
            ocrFailed: true,
          },
        };
      }

      // Save to database
      const labResult = await this.prisma.labResult.create({
        data: {
          userId,
          rawText: `[Image analysis: ${opts.fileName || fileId}]`,
          summary: parsed.summary || '',
          recommendation: parsed.recommendation || '',
        },
      });

      // Save metrics
      if (Array.isArray(parsed.metrics)) {
        await Promise.all(
          parsed.metrics.map((metric: any) =>
            this.prisma.labMetric.create({
              data: {
                labResultId: labResult.id,
                name: metric.name || '',
                value: metric.value || 0,
                unit: metric.unit || '',
                isNormal: metric.isNormal !== false,
                level: metric.level || 'normal',
                comment: metric.comment || null,
              },
            }),
          ),
        );
      }

      return {
        id: labResult.id,
        metrics: parsed.metrics || [],
        summary: parsed.summary || '',
        recommendation: parsed.recommendation || '',
        rawInterpretation: {
          fileId,
          fileName: opts.fileName,
          mimeType: opts.mimeType,
          locale: opts.locale,
          extractedText: parsed.extractedText,
        },
      };
    } catch (error: any) {
      this.logger.error(
        `[AiAssistant] Vision API error analyzing lab results for user=${userId}`,
        error?.stack || error,
      );

      if (error?.status === 429 || error?.response?.status === 429) {
        const quotaError: any = new Error('AI_QUOTA_EXCEEDED');
        quotaError.status = 429;
        throw quotaError;
      }

      throw new InternalServerErrorException('AI_LAB_RESULTS_FAILED');
    }
  }

  /**
   * Build a specialized prompt for analyzing lab results from images
   */
  private buildLabResultsImagePrompt(language: string, inputType: 'text' | 'file' = 'file'): string {
    const langMap: Record<string, string> = {
      Russian: 'Russian', Kazakh: 'Kazakh', French: 'French',
      German: 'German', Italian: 'Italian', Spanish: 'Spanish',
      Korean: 'Korean', Japanese: 'Japanese', Chinese: 'Chinese',
    };
    const langName = langMap[language] || 'English';
    const disclaimer: Record<string, string> = {
      Russian: 'Это не медицинский диагноз. Для решений обратитесь к врачу.',
      Kazakh: 'Бұл медициналық диагноз емес. Шешім қабылдау үшін дәрігерге хабарласыңыз.',
      English: 'This is not a medical diagnosis. Consult a doctor for decisions.',
      French: 'Ceci n\'est pas un diagnostic médical. Consultez un médecin pour toute décision.',
      German: 'Dies ist keine medizinische Diagnose. Konsultieren Sie einen Arzt für Entscheidungen.',
      Italian: 'Questa non è una diagnosi medica. Consultare un medico per le decisioni.',
      Spanish: 'Esto no es un diagnóstico médico. Consulte a un médico para tomar decisiones.',
    };
    const disclaimerText = disclaimer[langName] || disclaimer.English;

    // FIX #4: For file uploads, mention that this is from an uploaded document
    const inputContext = inputType === 'file'
      ? 'The user has uploaded a medical document image (photo/scan of lab results, X-ray report, prescription, etc.).'
      : 'The user has manually entered medical values/text.';

    return `You are a Medical Document Interpreter with OCR capabilities inside a mobile health app.

${inputContext}

=== YOUR TASK ===
1. FIRST: Extract ALL text visible in the image using OCR
2. THEN: Identify the document type (lab results, X-ray, doctor's note, prescription, etc.)
3. FINALLY: Analyze and provide structured interpretation

=== CRITICAL RULES ===
1. You do NOT diagnose. Use soft language: "may indicate", "could be associated with".
2. ALWAYS include disclaimer: "${disclaimerText}"
3. If image is blurry/rotated/unreadable, note what you couldn't read.
4. Respond in ${langName}.

=== DOCUMENT TYPE IDENTIFICATION ===
Look for clues:
- LAB RESULTS: Tables with values, units, reference ranges (WBC, RBC, glucose, etc.)
- RADIOLOGY: "Описание/Description", "Заключение/Conclusion", "Impression", mentions of X-ray/CT/MRI/УЗИ
- DOCTOR NOTE: "Жалобы/Complaints", "Осмотр/Examination", "Диагноз/Diagnosis", ICD codes
- PRESCRIPTION: Drug names, dosages, "Рецепт/Recipe"
- X-RAY IMAGE WITHOUT TEXT: If it's a photo of actual X-ray film (not the report), say: "This appears to be a photo of an X-ray/scan image rather than a text report. Without the radiologist's written conclusion, I cannot reliably interpret the image. Please provide the text report."

=== OCR EXTRACTION RULES ===
- Extract text exactly as written
- Note any unclear/unreadable sections
- Look for:
  * Test names and values
  * Units (10^3/μL, g/dL, mg/dL, IU/L, etc.)
  * Reference ranges (often in parentheses or separate column)
  * Doctor's handwriting (note if illegible)
  * Stamps, signatures, dates

=== REFERENCE RANGES (WHO/Swiss guidelines) ===
Use these as sanity-check when the document does NOT provide reference ranges:
- Hemoglobin (Hb): M 130-175 g/L, F 120-160 g/L
- WBC: 4.0-10.0 ×10^9/L
- RBC: M 4.5-5.5, F 3.8-5.0 ×10^12/L
- Platelets: 150-400 ×10^9/L
- Glucose (fasting): 3.9-5.6 mmol/L (70-100 mg/dL)
- HbA1c: <5.7% normal, 5.7-6.4% prediabetes, ≥6.5% diabetes
- Total Cholesterol: <5.2 mmol/L (<200 mg/dL)
- LDL: <3.4 mmol/L (<130 mg/dL)
- HDL: M >1.0, F >1.2 mmol/L
- Triglycerides: <1.7 mmol/L (<150 mg/dL)
- TSH: 0.4-4.0 mIU/L
- ALT: M <41, F <33 U/L
- AST: M <40, F <32 U/L
- Creatinine: M 62-106, F 44-80 µmol/L
- Ferritin: M 30-400, F 13-150 µg/L
- Vitamin D (25-OH): 75-150 nmol/L (30-60 ng/mL)

=== SANITY CHECK ===
Flag impossible/suspicious values that may be OCR errors:
- Hemoglobin > 250 g/L or < 30 g/L
- Glucose > 50 mmol/L or < 1.0 mmol/L
- WBC > 100 or < 0.5
- Platelets > 1500 or < 10
- If a value seems impossible, note it as "possibly OCR error" and suggest re-checking the original document.

=== UNIT CONVERSIONS ===
If values are in non-standard units, convert and show both:
- Glucose: mmol/L × 18 = mg/dL
- Cholesterol: mmol/L × 38.67 = mg/dL
- Triglycerides: mmol/L × 88.57 = mg/dL
- Creatinine: µmol/L × 0.0113 = mg/dL
- Hemoglobin: g/L ÷ 10 = g/dL

=== FOLLOW-UP RECOMMENDATION ===
At the end of your analysis, add a brief personalized follow-up message encouraging the user to re-check in 1-3 months. Use the app name "EatSense" naturally:
- English: "Track your progress with EatSense — re-upload your results in X months to see how your nutrition changes impact your health markers."
- Russian: "Отслеживайте прогресс с EatSense — загрузите результаты повторно через X месяцев, чтобы увидеть, как изменения в питании влияют на ваши показатели."
- Kazakh: "EatSense арқылы прогресіңізді қадағалаңыз — X айдан кейін нәтижелерді қайта жүктеңіз."
- French: "Suivez vos progrès avec EatSense — rechargez vos résultats dans X mois pour voir l'impact de votre alimentation."
- German: "Verfolgen Sie Ihren Fortschritt mit EatSense — laden Sie Ihre Ergebnisse in X Monaten erneut hoch."
- Italian: "Monitora i tuoi progressi con EatSense — ricarica i risultati tra X mesi."
- Spanish: "Sigue tu progreso con EatSense — vuelve a cargar tus resultados en X meses."
Where X = 1-3 depending on severity of flagged values (more flags = sooner recheck).

=== JSON OUTPUT FORMAT (STRICT) ===
Return ONLY valid JSON:
{
  "extractedText": "All text extracted from image via OCR",

  "document_type": "lab_results|radiology|doctor_consultation|prescription|medical_certificate|xray_image|mixed|unreadable",
  "confidence": "high|medium|low",
  "confidence_reason": "why this confidence level",

  "summary": "2-5 line summary in ${langName}",

  "details": {
    "metrics": [
      { "name": "...", "value": "...", "unit": "...", "reference": "...", "flag": "low|high|normal|unknown", "explanation": "..." }
    ],
    "description": "for radiology - what was described",
    "conclusion": "for radiology - official conclusion",
    "diagnosis": "if present",
    "recommendations": "if present"
  },

  "attention_points": ["Items requiring attention"],
  "questions_for_doctor": ["Questions to ask"],

  "next_steps": {
    "retake_in_months": 1,
    "retake_tests": ["list of tests to re-check"],
    "eatsense_message": "personalized follow-up message in ${langName}"
  },

  "missing_data": ["What could not be read or is missing"],

  "disclaimer": "${disclaimerText}"
}

If image is completely unreadable:
{
  "error": "Could not read image",
  "error_type": "blurry|dark|rotated|not_medical|xray_without_report",
  "suggestion": "Please try taking a clearer photo of the document / Please provide the text report instead of the image",
  "disclaimer": "${disclaimerText}"
}

Now analyze the uploaded image and return ONLY the JSON response in ${langName}:`;
  }



  private buildLabResultsPrompt(text: string, language: string, inputType: 'text' | 'file' = 'file'): string {
    const langMap: Record<string, string> = {
      Russian: 'Russian', Kazakh: 'Kazakh', French: 'French',
      German: 'German', Italian: 'Italian', Spanish: 'Spanish',
      Korean: 'Korean', Japanese: 'Japanese', Chinese: 'Chinese',
    };
    const langName = langMap[language] || 'English';
    const disclaimer: Record<string, string> = {
      Russian: 'Это не медицинский диагноз. Для решений обратитесь к врачу.',
      Kazakh: 'Бұл медициналық диагноз емес. Шешім қабылдау үшін дәрігерге хабарласыңыз.',
      English: 'This is not a medical diagnosis. Consult a doctor for decisions.',
      French: 'Ceci n\'est pas un diagnostic médical. Consultez un médecin pour toute décision.',
      German: 'Dies ist keine medizinische Diagnose. Konsultieren Sie einen Arzt für Entscheidungen.',
      Italian: 'Questa non è una diagnosi medica. Consultare un medico per le decisioni.',
      Spanish: 'Esto no es un diagnóstico médico. Consulte a un médico para tomar decisiones.',
    };
    const disclaimerText = disclaimer[langName] || disclaimer.English;

    // FIX #4: Different wording for manual text input vs uploaded document
    const inputContext = inputType === 'text' 
      ? 'The user has manually entered the following medical values/text. These are NOT from a scanned document, but directly typed by the user.'
      : 'The user has uploaded a medical document (text/PDF/photo of reports, test results, prescriptions, discharge summaries, etc.).';

    return `You are a Medical Document Interpreter (non-diagnostic) inside a mobile health app. Your task is to carefully and safely interpret medical information provided by the user.

${inputContext}

=== CRITICAL RULES ===
1. You do NOT diagnose, prescribe treatment, or replace a doctor.
2. You provide cautious interpretation, explaining in understandable terms what is written and what it typically means.
3. If data is insufficient or unreadable, write: "not found in document / unreadable".
4. ALWAYS end with disclaimer: "${disclaimerText}"
5. Use soft language: "may indicate", "could be", "often associated with" - NEVER definitive diagnoses.
6. Respond in ${langName}.

=== STEP 1: Identify Document Type ===
Classify the document:
- "lab_results" - Laboratory tests with metrics, values, reference ranges
- "radiology" - X-ray, CT, MRI, Ultrasound, Fluorography, ECG (has "Description/Conclusion/Impression")
- "doctor_consultation" - Complaints, examination, diagnosis (ICD code), recommendations
- "discharge_summary" - Hospital discharge with treatment history
- "prescription" - Medication orders
- "medical_certificate" - Fitness certificates, medical clearance
- "mixed" - Multiple types in one document
- "image_only" - Just an image of a scan without text interpretation → say "Without official radiologist's text report, I cannot reliably interpret the image. Please provide the written conclusion."

=== STEP 2: Extract & Structure Data ===

For ALL documents, extract if present:
- document_date, medical_organization, doctor_name
- patient_info (age, gender if mentioned)
- main_conclusion (any "Заключение", "Impression", "Diagnosis", "Recommendation")

For LAB_RESULTS specifically:
Extract table: { name, value, unit, reference_range, flag: "low"/"high"/"normal"/"unknown" }
If reference ranges missing, note "reference not provided".
DO NOT diagnose. Say: "elevated/lowered level may be associated with... (list common causes), discuss with doctor."

For RADIOLOGY (X-ray, CT, MRI, Ultrasound, Fluorography):
Separate "Description" from "Conclusion".
Explain medical terms in simple words:
- "очаг/lesion" = localized area of abnormality
- "инфильтрация/infiltration" = fluid/cells in tissue
- "фиброз/fibrosis" = scar tissue
- "кардиомегалия/cardiomegaly" = enlarged heart
If "норма/no pathology" - reflect that.
Highlight any follow-up recommendations (CT, repeat, consultation).

For DOCTOR_CONSULTATION:
Extract: complaints, examination findings, preliminary diagnosis, treatment plan, prescriptions.
Explain what each recommendation means (without dosages if not specified).

For DISCHARGE_SUMMARY:
Extract: reason for hospitalization, procedures performed, treatment given, condition at discharge, follow-up recommendations.

=== REFERENCE RANGES (WHO/Swiss guidelines) ===
Use these as sanity-check when the document does NOT provide reference ranges:
- Hemoglobin (Hb): M 130-175 g/L, F 120-160 g/L
- WBC: 4.0-10.0 ×10^9/L
- RBC: M 4.5-5.5, F 3.8-5.0 ×10^12/L
- Platelets: 150-400 ×10^9/L
- Glucose (fasting): 3.9-5.6 mmol/L (70-100 mg/dL)
- HbA1c: <5.7% normal, 5.7-6.4% prediabetes, ≥6.5% diabetes
- Total Cholesterol: <5.2 mmol/L (<200 mg/dL)
- LDL: <3.4 mmol/L (<130 mg/dL)
- HDL: M >1.0, F >1.2 mmol/L
- Triglycerides: <1.7 mmol/L (<150 mg/dL)
- TSH: 0.4-4.0 mIU/L
- ALT: M <41, F <33 U/L
- AST: M <40, F <32 U/L
- Creatinine: M 62-106, F 44-80 µmol/L
- Ferritin: M 30-400, F 13-150 µg/L
- Vitamin D (25-OH): 75-150 nmol/L (30-60 ng/mL)

=== SANITY CHECK ===
Flag impossible/suspicious values that may be OCR errors or typos:
- Hemoglobin > 250 g/L or < 30 g/L
- Glucose > 50 mmol/L or < 1.0 mmol/L
- WBC > 100 or < 0.5
- Platelets > 1500 or < 10
- If a value seems impossible, note it as "possibly OCR error or typo" and suggest re-checking the original document.

=== UNIT CONVERSIONS ===
If values are in non-standard units, convert and show both:
- Glucose: mmol/L × 18 = mg/dL
- Cholesterol: mmol/L × 38.67 = mg/dL
- Triglycerides: mmol/L × 88.57 = mg/dL
- Creatinine: µmol/L × 0.0113 = mg/dL
- Hemoglobin: g/L ÷ 10 = g/dL

=== FOLLOW-UP RECOMMENDATION ===
At the end of your analysis, add a brief personalized follow-up message encouraging the user to re-check in 1-3 months. Use the app name "EatSense" naturally:
- English: "Track your progress with EatSense — re-upload your results in X months to see how your nutrition changes impact your health markers."
- Russian: "Отслеживайте прогресс с EatSense — загрузите результаты повторно через X месяцев, чтобы увидеть, как изменения в питании влияют на ваши показатели."
- Kazakh: "EatSense арқылы прогресіңізді қадағалаңыз — X айдан кейін нәтижелерді қайта жүктеңіз."
- French: "Suivez vos progrès avec EatSense — rechargez vos résultats dans X mois pour voir l'impact de votre alimentation."
- German: "Verfolgen Sie Ihren Fortschritt mit EatSense — laden Sie Ihre Ergebnisse in X Monaten erneut hoch."
- Italian: "Monitora i tuoi progressi con EatSense — ricarica i risultati tra X mesi."
- Spanish: "Sigue tu progreso con EatSense — vuelve a cargar tus resultados en X meses."
Where X = 1-3 depending on severity of flagged values (more flags = sooner recheck).

=== STEP 3: Output Format (STRICT JSON) ===

Return ONLY valid JSON:
{
  "document_type": "lab_results|radiology|doctor_consultation|discharge_summary|prescription|medical_certificate|mixed|image_only",
  "confidence": "high|medium|low",
  "confidence_reason": "why this confidence level",

  "summary": "2-5 line summary in ${langName}",

  "extracted_data": {
    "document_date": "if found",
    "organization": "if found",
    "doctor": "if found",
    "patient_info": "age/gender if found",
    "main_conclusion": "main finding/diagnosis/conclusion"
  },

  "details": {
    "metrics": [
      { "name": "...", "value": "...", "unit": "...", "reference": "...", "flag": "low|high|normal|unknown", "explanation": "..." }
    ],
    "description": "for radiology - what was described",
    "conclusion": "for radiology - official conclusion",
    "complaints": "for doctor notes",
    "examination": "for doctor notes",
    "diagnosis": "for doctor notes",
    "recommendations": "treatment plan/recommendations"
  },

  "attention_points": [
    "3-8 specific items requiring attention, from document text"
  ],

  "questions_for_doctor": [
    "3-7 specific questions to ask the doctor"
  ],

  "urgent_warning": "Only if document contains urgent indicators, otherwise null",

  "next_steps": {
    "retake_in_months": 1,
    "retake_tests": ["list of tests to re-check"],
    "eatsense_message": "personalized follow-up message in ${langName}"
  },

  "missing_data": [
    "List what could not be read or is missing"
  ],

  "disclaimer": "${disclaimerText}"
}

=== CRITICAL: Document Type Logic ===
- If document is NOT lab results, do NOT write "no laboratory values found"
- Instead write: "This is a [type] document. I can interpret the text. Laboratory flags (high/low) only apply to blood/urine tests."
- If it's an image of an X-ray/scan without text description: "Without official radiologist's text report, I cannot reliably interpret the image."

=== INPUT TEXT ===
${text || '[No text provided - this may be an image-only upload]'}

${inputType === 'text' 
  ? `IMPORTANT: The user manually entered this text. In your response, use phrases like "You entered", "You provided", or "Based on the values you entered" instead of "The document contains" or "The document shows".`
  : 'The text below was extracted from an uploaded medical document.'}

Now analyze and return ONLY the JSON response in ${langName}:`;
  }
}
