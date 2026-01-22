/**
 * DietsCacheWarmerService
 * 
 * Pre-populates Redis cache on server startup for instant first-load performance.
 * This eliminates cold-start delays by ensuring diets data is cached before any requests.
 */

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { DietsService } from './diets.service';

// Locales to pre-warm
const LOCALES = ['en', 'ru', 'kk'];

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
        // Small delay to ensure all dependencies are ready
        setTimeout(() => this.warmCache(), 1000);
    }

    private async warmCache() {
        this.logger.log('🔥 Starting diets cache warm-up...');
        const startTime = Date.now();

        try {
            // Warm featured diets for all locales (parallel)
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

            // Warm full diets list for all locales (parallel)
            await Promise.all(
                LOCALES.map(async (locale) => {
                    try {
                        const allDiets = await this.dietsService.findAll({}, locale);
                        this.logger.debug(`[${locale}] All diets: ${allDiets.length} items cached`);
                    } catch (error) {
                        this.logger.warn(`[${locale}] All diets warm failed:`, error.message);
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
