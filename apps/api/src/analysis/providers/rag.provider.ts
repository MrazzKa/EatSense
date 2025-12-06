import { Injectable } from '@nestjs/common';
import {
  INutritionProvider,
  NutritionProviderId,
  NutritionLookupContext,
  NutritionProviderResult,
} from './nutrition-provider.interface';

@Injectable()
export class RagProvider implements INutritionProvider {
  readonly id: NutritionProviderId = 'rag';

  async isAvailable(_context: NutritionLookupContext): Promise<boolean> {
    // Disabled for now
    return false;
  }

  getPriority(_context: NutritionLookupContext): number {
    return 10; // Low priority
  }

  async findByText(
    _query: string,
    _context: NutritionLookupContext,
  ): Promise<NutritionProviderResult | null> {
    return null;
  }

  async getByBarcode(
    _barcode: string,
    _context: NutritionLookupContext,
  ): Promise<NutritionProviderResult | null> {
    return null;
  }
}
