import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { AxiosResponse } from 'axios';
import * as crypto from 'crypto';
import { PrismaService } from '../../prisma.service';
import { FtsService } from './fts/fts.service';
import { CacheService } from '../cache/cache.service';
import type { SearchFoodsDto } from './dto/search-foods.dto';

type NormalizedSearchBody = {
  query: string;
  dataType: string[];
  pageSize: number;
  pageNumber: number;
  sortBy: 'dataType.keyword' | 'lowercaseDescription.keyword' | 'fdcId' | 'publishedDate';
  sortOrder: 'asc' | 'desc';
  brandOwner?: string;
};

@Injectable()
export class FdcService {
  private readonly logger = new Logger(FdcService.name);
  private readonly requestTimeoutMs: number;
  private readonly maxRetries: number;

  constructor(
    private readonly http: HttpService,
    private readonly prisma: PrismaService,
    private readonly fts: FtsService,
    private readonly cache: CacheService,
  ) {
    // FIX: Increased default timeout to 10000ms for USDA reliability
    this.requestTimeoutMs = parseInt(process.env.FDC_TIMEOUT_MS || '10000', 10);
    this.maxRetries = parseInt(process.env.FDC_MAX_RETRIES || '3', 10);
  }

  private hashSearchQuery(body: Record<string, unknown>): string {
    const serialized = JSON.stringify(body);
    return crypto.createHash('sha1').update(serialized).digest('hex');
  }

  async searchFoods(body: SearchFoodsDto) {
    const normalizedBody = this.normalizeSearchBody(body);
    const cacheKey = this.hashSearchQuery(normalizedBody);
    const cached = await this.cache.get<any>(cacheKey, 'usda:search');
    if (cached) {
      this.logger.debug(`provider=usda cache=hit namespace=usda:search key=${cacheKey}`);
      return cached;
    }
    this.logger.debug(`provider=usda cache=miss namespace=usda:search key=${cacheKey}`);

    try {
      const { data, headers } = await this.requestWithRetry('post', '/v1/foods/search', { body: normalizedBody });

      // Log rate limit info
      const remaining = headers['x-ratelimit-remaining'];
      const limit = headers['x-ratelimit-limit'];
      if (remaining !== undefined) {
        this.logger.debug(`provider=usda event=rate-limit remaining=${remaining} limit=${limit}`);
      }

      await this.cache.set(cacheKey, data, 'usda:search');

      if (Array.isArray(data?.foods) && data.foods.length) {
        void this.slimUpsertBrandedSearchResults(data.foods);
      }

      // If no results and fallback enabled, try FTS
      if ((Array.isArray(data?.foods) && data.foods.length === 0) && this.isFallbackEnabled()) {
        return this.buildFtsFallback(cacheKey, body.query, normalizedBody.pageSize);
      }

      return data;
    } catch (error: any) {
      if (this.isFallbackEnabled()) {
        const fallback = await this.tryFtsFallback(cacheKey, body.query, normalizedBody.pageSize);
        if (fallback) {
          return fallback;
        }
      }
      if (error.response?.status === 429) {
        this.logger.warn('provider=usda error=rate-limit');
        throw new HttpException('USDA API rate limit exceeded. Please try again later.', HttpStatus.TOO_MANY_REQUESTS);
      }
      if (error.response?.status === 403) {
        throw new HttpException('USDA API access forbidden. Check API key.', HttpStatus.FORBIDDEN);
      }
      this.logger.error(`Search error: ${error.message}`);
      throw new HttpException(`USDA API error: ${error.message}`, error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async getFood(fdcId: number | string, opts?: { format?: 'abridged' | 'full'; nutrients?: number[] }) {
    const cacheKey = `${fdcId}_${opts?.format || 'full'}`;
    const cached = await this.cache.get<any>(cacheKey, 'usda:detail');
    if (cached) {
      this.logger.debug(`provider=usda cache=hit namespace=usda:detail key=${cacheKey}`);
      return cached;
    }
    this.logger.debug(`provider=usda cache=miss namespace=usda:detail key=${cacheKey}`);

    try {
      const params: any = {};
      if (opts?.format) params.format = opts.format;
      if (opts?.nutrients?.length) params.nutrients = opts.nutrients.join(',');

      const { data } = await this.requestWithRetry('get', `/v1/food/${fdcId}`, { params });

      await this.cache.set(cacheKey, data, 'usda:detail');

      // Lazy slim upsert for Branded foods
      try {
        await this.slimUpsertIfBranded(data);
      } catch (upsertErr: any) {
        this.logger.warn(`slimUpsert failed for fdcId=${fdcId}: ${upsertErr.message}`);
      }

      return data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        throw new HttpException('Food not found in USDA database', HttpStatus.NOT_FOUND);
      }
      if (error.response?.status === 429) {
        throw new HttpException('USDA API rate limit exceeded', HttpStatus.TOO_MANY_REQUESTS);
      }
      this.logger.error(`Get food error: ${error.message}`);
      throw new HttpException(`USDA API error: ${error.message}`, error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async getFoods(fdcIds: (number | string)[], opts?: { format?: 'abridged' | 'full'; nutrients?: number[] }) {
    if (!fdcIds || fdcIds.length === 0) {
      throw new HttpException('fdcIds array is required', HttpStatus.BAD_REQUEST);
    }
    if (fdcIds.length > 20) {
      throw new HttpException('Maximum 20 fdcIds allowed per request', HttpStatus.BAD_REQUEST);
    }

    const body: any = { fdcIds: fdcIds.map(Number) };
    if (opts?.format) body.format = opts.format;
    if (opts?.nutrients?.length) body.nutrients = opts.nutrients;

    try {
      const { data } = await firstValueFrom<AxiosResponse<any>>(
        this.http.post('/v1/foods', body) as any,
      );

      return data;
    } catch (error: any) {
      if (error.response?.status === 429) {
        throw new HttpException('USDA API rate limit exceeded', HttpStatus.TOO_MANY_REQUESTS);
      }
      this.logger.error(`Get foods error: ${error.message}`);
      throw new HttpException(`USDA API error: ${error.message}`, error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async listFoods(body: {
    dataType?: ('Branded' | 'Foundation' | 'Survey (FNDDS)' | 'SR Legacy')[];
    pageSize?: number;
    pageNumber?: number;
    sortBy?: 'dataType.keyword' | 'lowercaseDescription.keyword' | 'fdcId' | 'publishedDate';
    sortOrder?: 'asc' | 'desc';
  }) {
    try {
      // Use requestWithRetry which adds api_key as query parameter
      const { data } = await this.requestWithRetry('post', '/v1/foods/list', { body });

      return data;
    } catch (error: any) {
      if (error.response?.status === 429) {
        throw new HttpException('USDA API rate limit exceeded', HttpStatus.TOO_MANY_REQUESTS);
      }
      this.logger.error(`[FDC] List foods error: ${error.message}`);
      throw new HttpException(`USDA API error: ${error.message}`, error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Extract nutrition data from USDA food item
   * Handles both Branded (labelNutrients) and Foundation/SR Legacy (foodNutrients)
   */
  extractNutrition(foodItem: any): {
    calories: number;
    protein: number;
    fat: number;
    carbs: number;
  } {
    let calories = 0;
    let protein = 0;
    let fat = 0;
    let carbs = 0;

    // Branded foods have labelNutrients
    if (foodItem.labelNutrients) {
      calories = foodItem.labelNutrients.energy?.value || 0;
      protein = foodItem.labelNutrients.protein?.value || 0;
      fat = foodItem.labelNutrients.fat?.value || 0;
      carbs = foodItem.labelNutrients.carbohydrates?.value || 0;
    } else if (foodItem.foodNutrients) {
      // Foundation/SR Legacy foods use foodNutrients array
      for (const nutrient of foodItem.foodNutrients) {
        const nutrientId = nutrient.nutrient?.id || nutrient.nutrientId;
        const value = nutrient.amount || nutrient.value || 0;

        // Energy: Use Atwater (2047 or 2048) if available, otherwise 1008
        if (nutrientId === 2047 || nutrientId === 2048) {
          calories = value;
        } else if (nutrientId === 1008 && calories === 0) {
          calories = value;
        }

        // Protein (ID 1003)
        if (nutrientId === 1003) {
          protein = value;
        }

        // Fat (ID 1004)
        if (nutrientId === 1004) {
          fat = value;
        }

        // Carbs (ID 1005)
        if (nutrientId === 1005) {
          carbs = value;
        }
      }
    }

    return { calories, protein, fat, carbs };
  }

  private async requestWithRetry(
    method: 'get' | 'post',
    url: string,
    options: { params?: any; body?: any },
  ): Promise<{ data: any; headers: Record<string, any> }> {
    let attempt = 0;
    const isRetryable = (status?: number) => !status || status >= 500 || status === 429 || status === 408;
    let lastError: any;

    // USDA FDC API requires api_key as query parameter, not header
    const apiKey = process.env.FDC_API_KEY || process.env.USDA_API_KEY;
    const paramsWithKey = {
      ...(options.params || {}),
      ...(apiKey ? { api_key: apiKey } : {}),
    };

    while (attempt <= this.maxRetries) {
      try {
        if (method === 'get') {
          const resp = await firstValueFrom<AxiosResponse<any>>(
            this.http.get(url, { params: paramsWithKey, timeout: this.requestTimeoutMs }) as any,
          );
          return resp;
        } else {
          // For POST requests, add api_key to URL as query param
          const urlWithKey = apiKey ? `${url}${url.includes('?') ? '&' : '?'}api_key=${apiKey}` : url;
          const resp = await firstValueFrom<AxiosResponse<any>>(
            this.http.post(urlWithKey, options.body, { timeout: this.requestTimeoutMs }) as any,
          );
          return resp;
        }
      } catch (err: any) {
        lastError = err;
        const status = err?.response?.status;
        if (attempt < this.maxRetries && isRetryable(status)) {
          const backoffMs = Math.min(500, 200 * Math.pow(2, attempt));
          this.logger.warn(`provider=usda retry=${attempt + 1} method=${method.toUpperCase()} status=${status ?? 'unknown'} delay=${backoffMs}ms`);
          await new Promise((r) => setTimeout(r, backoffMs));
          attempt++;
          continue;
        }
        throw err;
      }
    }

    throw lastError;
  }

  private pickLabelNutrients(src: any) {
    if (!src) return null;
    return {
      calories: src.energy?.value ?? null,
      protein: src.protein?.value ?? null,
      fat: src.fat?.value ?? null,
      carbohydrates: src.carbohydrates?.value ?? null,
      fiber: src.fiber?.value ?? null,
      sugars: src.sugars?.value ?? null,
      sodium: src.sodium?.value ?? null,
      cholesterol: src.cholesterol?.value ?? null,
      potassium: src.potassium?.value ?? null,
      calcium: src.calcium?.value ?? null,
      iron: src.iron?.value ?? null,
    };
  }

  private normalizeSearchBody(body: SearchFoodsDto): NormalizedSearchBody {
    const pageSize = body.pageSize ?? 25;
    const pageNumber = body.pageNumber ?? 1;

    return {
      query: body.query,
      dataType: body.dataType && body.dataType.length ? body.dataType : ['Branded', 'Foundation'],
      pageSize,
      pageNumber,
      sortBy: body.sortBy ?? 'dataType.keyword',
      sortOrder: body.sortOrder ?? 'asc',
      brandOwner: body.brandOwner || undefined,
    };
  }

  private isFallbackEnabled(): boolean {
    return process.env.NUTRITION_FEATURE_FALLBACK !== 'false';
  }

  private async buildFtsFallback(cacheKey: string, query: string, pageSize?: number) {
    const limit = pageSize && typeof pageSize === 'number' ? pageSize : 25;
    const ftsRows = await this.fts.searchFoodsFTS(query, limit);
    const fallback = {
      foods: ftsRows.map((r: any) => ({
        fdcId: r.fdc_id,
        description: r.description,
        dataType: r.data_type,
        brandOwner: r.brand_owner,
        score: r.rank,
        source: 'FTS',
      })),
      total: ftsRows.length,
    };
    await this.cache.set(cacheKey, fallback, 'usda:search');
    this.logger.warn(`provider=usda cache=fallback namespace=usda:search key=${cacheKey} strategy=fts`);
    return fallback;
  }

  private async tryFtsFallback(cacheKey: string, query: string, pageSize?: number) {
    try {
      return await this.buildFtsFallback(cacheKey, query, pageSize);
    } catch (fallbackError: any) {
      this.logger.error(`FTS fallback failed: ${fallbackError.message}`);
      return null;
    }
  }

  private async slimUpsertBrandedSearchResults(foods: any[]): Promise<void> {
    const branded = foods.filter((food) => food?.dataType === 'Branded');
    if (!branded.length) {
      return;
    }

    const results = await Promise.allSettled(
      branded.slice(0, 25).map((food) =>
        this.prisma.food.upsert({
          where: { fdcId: Number(food.fdcId) },
          create: {
            fdcId: Number(food.fdcId),
            dataType: food.dataType,
            description: food.description || '',
            brandOwner: food.brandOwner || null,
            gtinUpc: food.gtinUpc || null,
            source: 'USDA_API',
          },
          update: {
            description: food.description || undefined,
            brandOwner: food.brandOwner || undefined,
            gtinUpc: food.gtinUpc || undefined,
            source: 'USDA_API',
          },
        }),
      ),
    );

    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        const food = branded[index];
        const reason = result.reason instanceof Error ? result.reason.message : String(result.reason);
        this.logger.warn(`Slim upsert (search) failed for fdcId=${food?.fdcId}: ${reason}`);
      }
    });
  }

  private async slimUpsertIfBranded(food: any): Promise<void> {
    if (!food || food.dataType !== 'Branded') return;
    const label = this.pickLabelNutrients(food.labelNutrients);

    const upserted = await this.prisma.food.upsert({
      where: { fdcId: Number(food.fdcId) },
      create: {
        fdcId: Number(food.fdcId),
        dataType: food.dataType,
        description: food.description || '',
        brandOwner: food.brandOwner || null,
        gtinUpc: food.gtinUpc || null,
        scientificName: food.scientificName || null,
        source: 'USDA_API',
        label: label ? { create: label } : undefined,
        portions: food.foodPortions?.length
          ? {
            createMany: {
              skipDuplicates: true,
              data: food.foodPortions.map((p: any) => ({
                gramWeight: p.gramWeight || 0,
                measureUnit: p.measureUnit?.abbreviation || p.measureUnit || 'g',
                modifier: p.modifier || null,
                amount: p.amount ?? null,
              })),
            },
          }
          : undefined,
      },
      update: {
        description: food.description || undefined,
        brandOwner: food.brandOwner || undefined,
        gtinUpc: food.gtinUpc || undefined,
        scientificName: food.scientificName || undefined,
        source: 'USDA_API',
        label: label
          ? {
            upsert: {
              create: label,
              update: label,
            },
          }
          : undefined,
      },
      include: { label: true },
    });

    // Ensure search_vector is updated (trigger will handle normally, but force just in case)
    await this.prisma.$executeRawUnsafe(
      `UPDATE foods SET description = description WHERE id = $1`,
      upserted.id,
    );
  }
}

