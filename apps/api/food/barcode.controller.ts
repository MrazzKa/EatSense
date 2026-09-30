import { Controller, Get, Param, Query, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { BarcodeService } from './barcode.service';

/**
 * Packaged products by barcode.
 *
 * A GET, and free of the daily analysis budget on purpose: this costs one cached
 * HTTP call to a public database, not a model invocation, so metering it would
 * only teach people not to scan.
 */
@ApiTags('Food')
@Controller('food/barcode')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class BarcodeController {
  constructor(private readonly barcode: BarcodeService) {}

  @Get(':code')
  @ApiOperation({
    summary: 'Look up a packaged product by its barcode',
    description:
      'Returns status "found" with nutrition facts, "no_nutrition" when the product is known ' +
      'but its label is empty, or "not_found". The app should let the user type the facts in ' +
      'for the middle case rather than treating it as a failure.',
  })
  @ApiResponse({ status: 200, description: 'Lookup result.' })
  @ApiResponse({ status: 400, description: 'Not a barcode, or the check digit does not match.' })
  async lookup(@Param('code') code: string, @Query('locale') locale: string, @Request() req: any) {
    const result = await this.barcode.lookup(code, locale);
    this.logIfInteresting(result.status, code, req.user?.id);
    return result;
  }

  /**
   * A barcode the database does not know is the one thing worth counting here:
   * enough of them from the same region means the catalogue, not the scanner, is
   * what needs work.
   */
  private logIfInteresting(status: string, code: string, userId?: string) {
    if (status === 'not_found') {
      // eslint-disable-next-line no-console
      console.log(`[Barcode] miss code=${code} user=${userId ?? 'anonymous'}`);
    }
  }
}
