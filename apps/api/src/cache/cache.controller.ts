import {
  Controller,
  Get,
  Put,
  Delete,
  Head,
  Param,
  Body,
  HttpCode,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiBody, ApiResponse } from '@nestjs/swagger';
import { CacheService } from './cache.service';

interface CacheSetRequest {
  value: any;
  ttl?: number;
}

@ApiTags('cache')
@Controller('cache')
export class CacheController {
  constructor(private readonly cacheService: CacheService) {}

  @Get(':key')
  @ApiOperation({ summary: 'Get cached value by key' })
  @ApiParam({ name: 'key', description: 'Cache key' })
  @ApiResponse({ status: 200, description: 'Cache value retrieved' })
  @ApiResponse({ status: 404, description: 'Cache key not found' })
  async get(@Param('key') key: string) {
    const value = await this.cacheService.get(decodeURIComponent(key));
    
    if (value === null) {
      throw new NotFoundException('Cache key not found');
    }
    
    return { value };
  }

  @Put(':key')
  @ApiOperation({ summary: 'Set cached value' })
  @ApiParam({ name: 'key', description: 'Cache key' })
  @ApiBody({ description: 'Cache value and TTL', schema: {
    type: 'object',
    properties: {
      value: { description: 'Value to cache' },
      ttl: { type: 'number', description: 'Time to live in seconds' }
    },
    required: ['value']
  }})
  @HttpCode(HttpStatus.NO_CONTENT)
  async set(@Param('key') key: string, @Body() body: CacheSetRequest) {
    await this.cacheService.set(
      decodeURIComponent(key),
      body.value,
      'general',
      body.ttl,
    );
  }

  @Delete(':key')
  @ApiOperation({ summary: 'Delete cached value' })
  @ApiParam({ name: 'key', description: 'Cache key' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('key') key: string) {
    await this.cacheService.delete(decodeURIComponent(key));
  }

  @Head(':key')
  @ApiOperation({ summary: 'Check if cache key exists' })
  @ApiParam({ name: 'key', description: 'Cache key' })
  @ApiResponse({ status: 200, description: 'Cache key exists' })
  @ApiResponse({ status: 404, description: 'Cache key not found' })
  async has(@Param('key') key: string) {
    const exists = await this.cacheService.exists(decodeURIComponent(key));
    
    if (!exists) {
      throw new NotFoundException('Cache key not found');
    }
  }

  @Delete()
  @ApiOperation({ summary: 'Clear all cache entries' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async clear() {
    await this.cacheService.clear();
  }

  @Get('health/check')
  @ApiOperation({ summary: 'Check cache health' })
  @ApiResponse({ status: 200, description: 'Cache health status' })
  async healthCheck() {
    const isHealthy = await this.cacheService.healthCheck();
    
    return {
      status: isHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      service: 'redis-cache'
    };
  }
}
