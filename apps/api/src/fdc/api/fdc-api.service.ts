import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import * as crypto from 'crypto';
import { CacheService } from '../../cache/cache.service';

@Injectable()
export class FdcApiService {
  private readonly logger = new Logger(FdcApiService.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly cache: CacheService,
  ) {}

  async searchFoods(body: any): Promise<any> {
    const cacheKey = `api:${this.hashBody(body)}`;
    const cached = await this.cache.get<any>(cacheKey, 'usda:search');
    if (cached) {
      this.logger.debug(`provider=usda cache=hit namespace=usda:search key=${cacheKey}`);
      return cached;
    }
    this.logger.debug(`provider=usda cache=miss namespace=usda:search key=${cacheKey}`);

    try {
      const response = await firstValueFrom(
        this.httpService.post('/v1/foods/search', body),
      );

      // Log rate limit headers
      const rateLimitHeaders = {
        'X-RateLimit-Limit': response.headers['x-ratelimit-limit'],
        'X-RateLimit-Remaining': response.headers['x-ratelimit-remaining'],
        'X-RateLimit-Reset': response.headers['x-ratelimit-reset'],
      };
      this.logger.debug(`provider=usda event=rate-limit remaining=${rateLimitHeaders['X-RateLimit-Remaining']} limit=${rateLimitHeaders['X-RateLimit-Limit']}`);

      await this.cache.set(cacheKey, response.data, 'usda:search');

      return response.data;
    } catch (error: any) {
      this.logger.error(`USDA search error: ${error.message}`);
      
      if (error.response?.status === 429) {
        throw new HttpException(
          'Rate limit exceeded. Please try again later.',
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
      
      if (error.response?.status >= 500) {
        throw new HttpException(
          'USDA API server error',
          HttpStatus.BAD_GATEWAY,
        );
      }

      throw new HttpException(
        error.response?.data?.message || 'Failed to search foods',
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get food by FDC ID
   * Cached for 72 hours
   */
  async getFood(fdcId: number): Promise<any> {
    const cacheKey = `api:${fdcId}`;
    const cached = await this.cache.get<any>(cacheKey, 'usda:detail');
    if (cached) {
      this.logger.debug(`provider=usda cache=hit namespace=usda:detail key=${cacheKey}`);
      return cached;
    }
    this.logger.debug(`provider=usda cache=miss namespace=usda:detail key=${cacheKey}`);

    try {
      const response = await firstValueFrom(
        this.httpService.get(`/v1/food/${fdcId}`),
      );

      await this.cache.set(cacheKey, response.data, 'usda:detail');

      return response.data;
    } catch (error: any) {
      this.logger.error(`USDA getFood error for ${fdcId}: ${error.message}`);
      
      if (error.response?.status === 404) {
        throw new HttpException('Food not found', HttpStatus.NOT_FOUND);
      }
      
      if (error.response?.status === 429) {
        throw new HttpException(
          'Rate limit exceeded. Please try again later.',
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }

      throw new HttpException(
        error.response?.data?.message || 'Failed to get food',
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get multiple foods by FDC IDs
   */
  async getFoods(fdcIds: number[]): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.post('/v1/foods', { fdcIds }),
      );

      return response.data;
    } catch (error: any) {
      this.logger.error('USDA getFoods error:', error.message);
      throw new HttpException(
        error.response?.data?.message || 'Failed to get foods',
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * List foods with pagination
   */
  async listFoods(body: any): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.post('/v1/foods/list', body),
      );

      return response.data;
    } catch (error: any) {
      this.logger.error('USDA listFoods error:', error.message);
      throw new HttpException(
        error.response?.data?.message || 'Failed to list foods',
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  private hashBody(body: any): string {
    const str = JSON.stringify(body);
    return crypto.createHash('sha1').update(str).digest('hex');
  }
}

