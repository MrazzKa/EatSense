import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma.service';
import { CanonicalFood, CanonicalNutrients, NutritionCategory, NutritionProviderId } from './nutrition-provider.interface';

/**
 * Service for fast lookup of top 100 most common foods from local database
 * This provides instant results (< 1ms) for frequently used products
 */
@Injectable()
export class LocalFoodService {
  private readonly logger = new Logger(LocalFoodService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Search for food in local database by name
   * Uses fuzzy matching on normalized names
   */
  async findLocalFood(query: string, locale: 'en' | 'ru' | 'kk' = 'en'): Promise<CanonicalFood | null> {
    try {
      const normalizedQuery = this.normalizeName(query);

      // Try exact match first
      let localFood = await this.prisma.localFood.findFirst({
        where: {
          name: normalizedQuery,
        },
      });

      // If not found, try fuzzy match on name fields
      if (!localFood) {
        const nameField = locale === 'ru' ? 'nameRu' : locale === 'kk' ? 'nameKk' : 'nameEn';
        localFood = await this.prisma.localFood.findFirst({
          where: {
            OR: [
              { name: { contains: normalizedQuery, mode: 'insensitive' } },
              { [nameField]: { contains: normalizedQuery, mode: 'insensitive' } },
            ],
          },
          orderBy: {
            popularity: 'asc', // Most popular first
          },
        });
      }

      if (!localFood) {
        return null;
      }

      // Convert to CanonicalFood format
      const canonicalFood: CanonicalFood = {
        displayName: this.getDisplayName(localFood, locale),
        originalQuery: query, // Original search query
        per100g: {
          calories: localFood.calories,
          protein: localFood.protein,
          carbs: localFood.carbs,
          fat: localFood.fat,
          fiber: localFood.fiber || 0,
          sugars: localFood.sugars || 0,
          satFat: localFood.satFat || 0,
        },
        defaultPortionG: 100, // Standard portion
        category: (localFood.category as NutritionCategory) || 'unknown',
        providerId: 'local_food' as NutritionProviderId,
        providerFoodId: localFood.id,
      };

      this.logger.debug(`[LocalFoodService] Found local food: ${canonicalFood.displayName}`);
      return canonicalFood;
    } catch (error: any) {
      // Handle case when local_foods table doesn't exist yet
      // This is non-critical - analysis will fallback to other providers
      if (error?.code === '42P01' || error?.message?.includes('does not exist')) {
        this.logger.warn(
          '[LocalFoodService] local_foods table does not exist - skipping local food lookup. Run migrations to enable.',
        );
        return null;
      }
      // Re-throw other errors
      throw error;
    }
  }

  /**
   * Normalize food name for matching
   */
  private normalizeName(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^a-zа-яё0-9\s]/g, '')
      .replace(/\s+/g, ' ');
  }

  /**
   * Get localized display name
   */
  private getDisplayName(localFood: any, locale: 'en' | 'ru' | 'kk'): string {
    if (locale === 'ru' && localFood.nameRu) {
      return localFood.nameRu;
    }
    if (locale === 'kk' && localFood.nameKk) {
      return localFood.nameKk;
    }
    if (localFood.nameEn) {
      return localFood.nameEn;
    }
    return localFood.name;
  }
}

