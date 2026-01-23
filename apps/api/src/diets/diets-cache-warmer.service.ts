/**
 * DietsCacheWarmerService
 * 
 * Pre-populates Redis cache on server startup for instant first-load performance.
 * This eliminates cold-start delays by ensuring diets data is cached before any requests.
 */

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { DietsService } from './diets.service';

// Locales to pre-warm
const LOCALES = ['en', 'ru', 'kk', 'fr'];

@Injectable()
export class DietsCacheWarmerService implements OnModuleInit {
    private readonly logger = new Logger(DietsCacheWarmerService.name);

    constructor(
        private readonly dietsService: DietsService,
    ) { }

    /**
     * Called automatically when the NestJS module initializes
     */
    async onModuleInit() {
        // Minimal delay to ensure Redis is connected
        setTimeout(() => this.warmCache(), 100);
    }

    private async warmCache() {
        this.logger.log('🔥 Starting diets cache warm-up...');
        const startTime = Date.now();

        try {
            // Warm bundle for all locales (this covers featured and all diets)
            await Promise.all(
                LOCALES.map(async (locale) => {
                    try {
                        // Use getBundle with null userId for public data
                        await this.dietsService.getBundle(null, locale);
                        this.logger.debug(`[${locale}] Bundle cached`);
                    } catch (error) {
                        this.logger.warn(`[${locale}] Bundle warm failed:`, error.message);
                    }
                })
            );

            // Warm featured diets separately for faster individual requests
            await Promise.all(
                LOCALES.map(async (locale) => {
                    try {
                        const featured = await this.dietsService.getFeatured(locale);
                        this.logger.debug(`[${locale}] Featured: ${featured.length} items cached`);
                    } catch (error) {
                        this.logger.warn(`[${locale}] Featured warm failed:`, error.message);
                    }
                })
            );

            const elapsed = Date.now() - startTime;
            this.logger.log(`✅ Diets cache warm-up completed in ${elapsed}ms`);
        } catch (error) {
            this.logger.error('❌ Diets cache warm-up failed:', error);
        }
    }
}

