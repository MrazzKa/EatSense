import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';

/**
 * Shared translation service. Used by:
 *   - MessagesService (chat translate button — per-message on-demand)
 *   - ConversationsService (auto-translate meal ingredient names for experts)
 *
 * Caching: in-memory by `${sha1(text)}:${target}`. Replace with Redis when we
 * scale beyond a single API instance.
 */
@Injectable()
export class TranslationService {
  private readonly logger = new Logger(TranslationService.name);
  private readonly cache = new Map<string, { value: string; ts: number }>();
  private readonly TTL_MS = 7 * 24 * 3600 * 1000;
  private readonly MAX_CACHE = 5000;

  hasApiKey(): boolean {
    return !!process.env.DEEPL_API_KEY;
  }

  /**
   * Translate a single text. Returns the original on missing key or error
   * (translation is a best-effort enhancement, never a blocker).
   */
  async translate(text: string, targetLocale: string): Promise<{ value: string; cached: boolean }> {
    if (!text || !text.trim()) return { value: text || '', cached: true };
    const target = (targetLocale || 'en').slice(0, 5).toUpperCase();
    const key = `${this.hash(text)}:${target}`;
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.ts < this.TTL_MS) {
      return { value: cached.value, cached: true };
    }
    if (!process.env.DEEPL_API_KEY) return { value: text, cached: false };
    try {
      const result = await this.callDeepL([text], target);
      const translation = result[0] || text;
      this.set(key, translation);
      return { value: translation, cached: false };
    } catch (e: any) {
      this.logger.warn(`[translate] failed for target=${target}: ${e?.message}`);
      return { value: text, cached: false };
    }
  }

  /**
   * Batch translate (one DeepL call per ≤50 strings). Misses are sent, hits served from cache.
   * Returns array in the same order as input.
   */
  async translateBatch(texts: string[], targetLocale: string): Promise<string[]> {
    const target = (targetLocale || 'en').slice(0, 5).toUpperCase();
    if (!texts.length) return [];
    if (!process.env.DEEPL_API_KEY) return texts.slice();

    const result = new Array<string>(texts.length);
    const missingIdx: number[] = [];
    const missingTexts: string[] = [];
    for (let i = 0; i < texts.length; i++) {
      const t = texts[i];
      if (!t || !t.trim()) {
        result[i] = t || '';
        continue;
      }
      const key = `${this.hash(t)}:${target}`;
      const cached = this.cache.get(key);
      if (cached && Date.now() - cached.ts < this.TTL_MS) {
        result[i] = cached.value;
      } else {
        missingIdx.push(i);
        missingTexts.push(t);
      }
    }
    if (missingTexts.length) {
      try {
        // DeepL accepts up to 50 text params per call.
        const chunks: string[][] = [];
        for (let i = 0; i < missingTexts.length; i += 50) {
          chunks.push(missingTexts.slice(i, i + 50));
        }
        let cursor = 0;
        for (const chunk of chunks) {
          const translated = await this.callDeepL(chunk, target);
          for (let j = 0; j < chunk.length; j++) {
            const i = missingIdx[cursor + j];
            const val = translated[j] || chunk[j];
            result[i] = val;
            this.set(`${this.hash(chunk[j])}:${target}`, val);
          }
          cursor += chunk.length;
        }
      } catch (e: any) {
        this.logger.warn(`[translateBatch] failed for target=${target}: ${e?.message}`);
        for (const i of missingIdx) result[i] = texts[i];
      }
    }
    return result;
  }

  private hash(s: string): string {
    return crypto.createHash('sha1').update(s).digest('hex').slice(0, 16);
  }

  private set(key: string, value: string) {
    if (this.cache.size >= this.MAX_CACHE) {
      // Naive eviction: drop the oldest 10% when full.
      const drop = Math.floor(this.MAX_CACHE / 10);
      let i = 0;
      for (const k of this.cache.keys()) {
        this.cache.delete(k);
        if (++i >= drop) break;
      }
    }
    this.cache.set(key, { value, ts: Date.now() });
  }

  private async callDeepL(texts: string[], target: string): Promise<string[]> {
    const apiKey = process.env.DEEPL_API_KEY!;
    const isFree = apiKey.endsWith(':fx');
    const endpoint = `https://api${isFree ? '-free' : ''}.deepl.com/v2/translate`;
    const body = new URLSearchParams();
    for (const t of texts) body.append('text', t);
    body.append('target_lang', target);
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `DeepL-Auth-Key ${apiKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });
    if (!res.ok) throw new Error(`DeepL ${res.status}`);
    const data: any = await res.json();
    return (data?.translations || []).map((t: any) => t.text || '');
  }
}
