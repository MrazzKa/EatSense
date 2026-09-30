import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import {
  OpenFoodFactsProvider,
  hasValidCheckDigit,
  normaliseBarcode,
} from '../src/analysis/providers/openfoodfacts.provider';
import type { PackagedProduct } from '../src/analysis/providers/openfoodfacts.provider';

export type BarcodeOutcome =
  /** Known product with a usable label. */
  | { status: 'found'; product: PackagedProduct }
  /** Known product, but nobody has filled in its nutrition facts. */
  | { status: 'no_nutrition'; product: PackagedProduct }
  /** The barcode is valid but absent from the database. */
  | { status: 'not_found'; barcode: string };

/**
 * Reading a barcode off a package.
 *
 * Deliberately a lookup and not an analysis: a barcode identifies a product
 * exactly, so there is nothing for a model to infer and nothing to charge an
 * analysis credit for. What the user then does with the result — log it, ignore
 * it, correct the portion — goes through the ordinary meal endpoints.
 */
@Injectable()
export class BarcodeService {
  private readonly logger = new Logger(BarcodeService.name);

  constructor(private readonly openFoodFacts: OpenFoodFactsProvider) {}

  async lookup(rawBarcode: string, locale?: string): Promise<BarcodeOutcome> {
    const barcode = normaliseBarcode(rawBarcode);
    if (!barcode) {
      throw new BadRequestException('A barcode is 8 to 14 digits.');
    }

    // Refusing a misread here saves a pointless request, and more importantly
    // stops a corrupted number that happens to exist from putting somebody
    // else's product in this user's diary.
    if (!hasValidCheckDigit(barcode)) {
      throw new BadRequestException('That barcode failed its check digit — scan it again.');
    }

    const product = await this.openFoodFacts.lookup(barcode, locale);
    if (!product) {
      this.logger.log(`[Barcode] ${barcode} not in the database`);
      return { status: 'not_found', barcode };
    }

    return product.hasNutrition
      ? { status: 'found', product }
      : { status: 'no_nutrition', product };
  }
}
