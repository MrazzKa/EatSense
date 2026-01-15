import { Injectable, Logger } from '@nestjs/common';
import { createHash } from 'crypto';
import OpenAI from 'openai';
import { CacheService } from '../cache/cache.service';

@Injectable()
export class FoodLocalizationService {
  private readonly logger = new Logger(FoodLocalizationService.name);
  private readonly openai: OpenAI;

  constructor(private readonly cache: CacheService) {
    // Use OPENAI_API_KEY_MINI for fast translations, fallback to main key
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY_MINI || process.env.OPENAI_API_KEY,
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
   * Batch translate multiple names in ONE API call
   * Saves 5+ seconds vs individual calls
   */
  async localizeNamesBatch(names: string[], locale?: 'en' | 'ru' | 'kk'): Promise<Map<string, string>> {
    const normalizedLocale = this.normalizeLocale(locale);
    const results = new Map<string, string>();

    if (normalizedLocale === 'en') {
      names.forEach(name => results.set(name, this.postProcess(name.trim())));
      return results;
    }

    const uniqueNames = [...new Set(names.filter(n => n && n.trim()))];
    if (uniqueNames.length === 0) return results;

    // Check cache first
    const uncachedNames: string[] = [];
    for (const name of uniqueNames) {
      const cacheKey = this.buildCacheKey(name, normalizedLocale);
      try {
        const cached = await this.cache.get<string>(cacheKey, 'analysis');
        if (cached) {
          results.set(name, this.postProcess(cached));
        } else {
          uncachedNames.push(name);
        }
      } catch {
        uncachedNames.push(name);
      }
    }

    if (uncachedNames.length === 0) {
      this.logger.debug(`[FoodLocalization] All ${uniqueNames.length} names from cache`);
      return results;
    }

    this.logger.debug(`[FoodLocalization] Batch translating ${uncachedNames.length} names`);

    try {
      const translations = await this.batchTranslate(uncachedNames, normalizedLocale);

      for (const [original, translated] of translations.entries()) {
        const finalName = this.postProcess(translated);
        results.set(original, finalName);
        const cacheKey = this.buildCacheKey(original, normalizedLocale);
        await this.cache.set(cacheKey, finalName, 'analysis', 60 * 60 * 24 * 30).catch(() => { });
      }
    } catch (error: any) {
      this.logger.warn(`[FoodLocalization] Batch failed: ${error.message}`);
      uncachedNames.forEach(name => results.set(name, this.postProcess(name)));
    }

    return results;
  }

  private async batchTranslate(names: string[], locale: 'ru' | 'kk'): Promise<Map<string, string>> {
    const languageName = locale === 'ru' ? 'Russian' : 'Kazakh';
    const results = new Map<string, string>();
    const numberedList = names.map((name, i) => `${i + 1}. ${name}`).join('\n');

    const response = await this.openai.chat.completions.create({
      model: process.env.OPENAI_FAST_MODEL || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: `Translate food names to ${languageName}. Output numbered list only.` },
        { role: 'user', content: numberedList },
      ],
      max_tokens: Math.max(100, names.length * 20),
      temperature: 0.3,
    });

    const content = response.choices[0]?.message?.content || '';
    const lines = content.split('\n').filter(line => line.trim());

    for (const line of lines) {
      const match = line.match(/^(\d+)[.)\s]+(.+)$/);
      if (match) {
        const index = parseInt(match[1], 10) - 1;
        const translation = match[2].trim();
        if (index >= 0 && index < names.length && translation) {
          results.set(names[index], translation);
        }
      }
    }

    names.forEach(name => {
      if (!results.has(name)) results.set(name, name);
    });

    return results;
  }

  private buildCacheKey(name: string, locale: string): string {
    return `food:translation:${locale}:${createHash('sha1').update(name.trim()).digest('hex')}`;
  }

  async localizeName(baseName: string, locale?: 'en' | 'ru' | 'kk'): Promise<string> {
    const normalizedLocale = this.normalizeLocale(locale);
    const trimmed = (baseName || '').trim();

    if (!trimmed || normalizedLocale === 'en') {
      return this.postProcess(trimmed);
    }

    const cacheKey = this.buildCacheKey(trimmed, normalizedLocale);
    try {
      const cached = await this.cache.get<string>(cacheKey, 'analysis');
      if (cached) return this.postProcess(cached);
    } catch { }

    const results = await this.localizeNamesBatch([trimmed], normalizedLocale);
    return results.get(trimmed) || this.postProcess(trimmed);
  }

  private postProcess(name: string): string {
    if (!name) return '';
    const normalized = name.replace(/\s+/g, ' ').trim();
    if (normalized.length <= 50) return normalized;
    const cut = normalized.slice(0, 50);
    const lastSpace = cut.lastIndexOf(' ');
    return (lastSpace > 0 ? cut.slice(0, lastSpace) : cut).trim() + '…';
  }
}
