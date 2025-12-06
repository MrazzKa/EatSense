import { Injectable, Logger } from '@nestjs/common';
import {
  INutritionProvider,
  NutritionProviderId,
  NutritionLookupContext,
  NutritionProviderResult,
} from './nutrition-provider.interface';

/**
 * EuroFIR Provider (scaffold)
 * 
 * EuroFIR (European Food Information Resource) provides standardized food composition data
 * across European countries. This provider is a placeholder for future integration.
 * 
 * Integration options:
 * 1. FoodEXplorer API (paid service) - requires API key and subscription
 * 2. EuroFIR CSV datasets - requires parsing and indexing
 * 3. National food composition databases aligned with EuroFIR standards
 * 
 * TODO: Implement when:
 * - EuroFIR_ENABLED=true is set
 * - API credentials or dataset files are available
 * - Priority: Medium (after Swiss DB is stable)
 */
@Injectable()
export class EuroFirProvider implements INutritionProvider {
  readonly id: NutritionProviderId = 'eurofir';
  private readonly logger = new Logger(EuroFirProvider.name);

  async isAvailable(context: NutritionLookupContext): Promise<boolean> {
    // Only available if explicitly enabled and for EU region
    if (process.env.EUROFIR_ENABLED !== 'true') {
      return false;
    }
    const region = context.region || 'OTHER';
    return region === 'EU' || region === 'OTHER';
  }

  getPriority(context: NutritionLookupContext): number {
    const region = context.region || 'OTHER';
    // Higher priority for EU region when enabled
    if (region === 'EU') return 110; // Between USDA (90) and Swiss (130 for CH)
    return 70; // Lower for other regions
  }

  async findByText(
    _query: string,
    _context: NutritionLookupContext,
  ): Promise<NutritionProviderResult | null> {
    // TODO: Implement EuroFIR integration
    // Options:
    // 1. FoodEXplorer API: https://www.foodexplorer.eu/
    //    - Requires API key
    //    - Search by food name, get EuroFIR-compliant data
    // 2. CSV datasets: Parse EuroFIR CSV files, build in-memory index
    //    - Requires file path in env: EUROFIR_CSV_PATH
    //    - Index by food name (lowercase, normalized)
    // 3. National databases: Integrate country-specific EuroFIR-aligned sources
    //    - e.g., German BLS, French Ciqual (if available)
    
    this.logger.debug('[EuroFirProvider] findByText not implemented yet');
    return null;
  }

  async getByBarcode(
    _barcode: string,
    _context: NutritionLookupContext,
  ): Promise<NutritionProviderResult | null> {
    // EuroFIR typically doesn't support barcode lookup
    return null;
  }
}

