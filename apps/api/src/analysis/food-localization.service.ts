import { Injectable, Logger } from '@nestjs/common';
import { createHash } from 'crypto';
import OpenAI from 'openai';
import { CacheService } from '../cache/cache.service';

@Injectable()
export class FoodLocalizationService {
  private readonly logger = new Logger(FoodLocalizationService.name);
  private readonly openai: OpenAI;

  constructor(private readonly cache: CacheService) {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  private normalizeLocale(locale?: string): 'en' | 'ru' | 'kk' {
    if (!locale) return 'en';
    const lower = locale.toLowerCase();
    if (lower === 'ru' || lower.startsWith('ru')) return 'ru';
    if (lower === 'kk' || lower.startsWith('kk') || lower.startsWith('kz')) return 'kk';
    return 'en';
  }

  /**
   * Localize a short English food/dish name into the target locale.
   * Uses OpenAI via a small translation prompt and caches results in Redis.
   */
  async localizeName(baseName: string, locale?: 'en' | 'ru' | 'kk'): Promise<string> {
    const normalizedLocale = this.normalizeLocale(locale);
    const trimmed = (baseName || '').trim();
    if (!trimmed || normalizedLocale === 'en') {
      return this.postProcess(trimmed);
    }

    const cacheKey = `food:translation:${normalizedLocale}:${createHash('sha1')
      .update(trimmed)
      .digest('hex')}`;

    try {
      const cached = await this.cache.get<string>(cacheKey, 'analysis');
      if (cached) {
        return this.postProcess(cached);
      }
    } catch (err) {
      // Non-critical: log and continue without failing
      this.logger.warn('[FoodLocalization] Failed to read cache', {
        error: err instanceof Error ? err.message : String(err),
      });
    }

    const languageName = normalizedLocale === 'ru' ? 'Russian' : 'Kazakh';

    const systemPrompt = [
      'You are a food name translator for a nutrition mobile app.',
      'Input: a SHORT English food or dish name.',
      `Output: a VERY short natural food name in ${languageName}.`,
      'Constraints:',
      '- Return ONLY the translated name, no explanations, no quotes.',
      '- It must be concise (ideally 2–5 words).',
    ].join('\n');

    const userPrompt = `LANGUAGE = ${languageName}\nName: "${trimmed}"`;

    let translated = trimmed;
    try {
      const model = process.env.OPENAI_MODEL || 'gpt-5.1';
      const response = await this.openai.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        max_completion_tokens: 40,
        temperature: 0.3,
      });

      const content = response.choices[0]?.message?.content || '';
      translated = (content || '').trim() || trimmed;
    } catch (error: any) {
      this.logger.warn('[FoodLocalization] Translation failed, falling back to English name', {
        error: error?.message || String(error),
      });
      translated = trimmed;
    }

    const finalName = this.postProcess(translated);

    try {
      // Cache for 30 days
      await this.cache.set(cacheKey, finalName, 'analysis', 60 * 60 * 24 * 30);
    } catch (err) {
      this.logger.warn('[FoodLocalization] Failed to write cache', {
        error: err instanceof Error ? err.message : String(err),
      });
    }

    return finalName;
  }

  private postProcess(name: string): string {
    if (!name) return '';
    const normalized = name.replace(/\s+/g, ' ').trim();
    const limit = 50;
    if (normalized.length <= limit) return normalized;

    const cut = normalized.slice(0, limit);
    const lastSpace = cut.lastIndexOf(' ');
    return (lastSpace > 0 ? cut.slice(0, lastSpace) : cut).trim() + '…';
  }
}


