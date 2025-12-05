import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

/**
 * Service for querying OpenFoodFacts API.
 * 
 * This is a scaffold for future barcode-based product lookup features.
 * Currently NOT integrated into the image analysis flow.
 * 
 * TODO: When implementing barcode scanning, use this service to:
 * - Look up products by barcode
 * - Extract nutrition data from OpenFoodFacts
 * - Merge with existing FDC matching logic if needed
 */
@Injectable()
export class OpenFoodFactsService {
  private readonly logger = new Logger(OpenFoodFactsService.name);
  private readonly baseUrl = process.env.OPENFOODFACTS_BASE_URL || 'https://world.openfoodfacts.org';

  constructor(private readonly httpService: HttpService) {}

  /**
   * Get product information by barcode
   * @param barcode - Product barcode (EAN-13, UPC, etc.)
   * @returns Product data if found, null otherwise
   */
  async getByBarcode(barcode: string): Promise<any | null> {
    if (!barcode || barcode.trim().length === 0) {
      this.logger.warn('[OpenFoodFactsService] Empty barcode provided');
      return null;
    }

    try {
      const url = `${this.baseUrl}/api/v0/product/${encodeURIComponent(barcode.trim())}.json`;
      
      this.logger.debug(`[OpenFoodFactsService] Fetching product for barcode: ${barcode}`);
      
      const response = await firstValueFrom(
        this.httpService.get(url, { timeout: 5000 })
      );

      if (response.data && response.data.status === 1 && response.data.product) {
        this.logger.debug(`[OpenFoodFactsService] Product found for barcode: ${barcode}`);
        return response.data.product;
      }

      // status === 0 means product not found
      this.logger.debug(`[OpenFoodFactsService] Product not found for barcode: ${barcode}`);
      return null;
    } catch (error: any) {
      // Log at debug/warn level, but don't throw
      // This is expected for products not in OpenFoodFacts database
      if (error.response?.status === 404) {
        this.logger.debug(`[OpenFoodFactsService] Product not found (404) for barcode: ${barcode}`);
      } else {
        this.logger.warn(`[OpenFoodFactsService] Error fetching product for barcode ${barcode}:`, error.message);
      }
      return null;
    }
  }
}

